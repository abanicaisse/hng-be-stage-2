import axios, { AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';
import {
  CountryApiResponse,
  CountryData,
  AppError,
  CountryResponse,
  FilterOptions,
} from '../types';
import { ExchangeRateService } from './exchange-rate.service';
import { ImageGeneratorService } from './image-generator.service';

const prisma = new PrismaClient();

export class CountryService {
  private static readonly API_URL =
    process.env.COUNTRIES_API_URL ||
    'https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies';
  private static readonly TIMEOUT = parseInt(process.env.API_TIMEOUT || '10000');

  private static async fetchCountriesFromApi(): Promise<CountryApiResponse[]> {
    try {
      console.log(`[${new Date().toISOString()}] Fetching countries from external API...`);

      const response = await axios.get<CountryApiResponse[]>(this.API_URL, {
        timeout: this.TIMEOUT,
        headers: {
          Accept: 'application/json',
        },
      });

      console.log(
        `[${new Date().toISOString()}] Successfully fetched ${response.data.length} countries`
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error('Countries API Error:', {
          message: axiosError.message,
          code: axiosError.code,
          status: axiosError.response?.status,
        });

        throw new AppError(
          503,
          'External data source unavailable',
          'Could not fetch data from Countries API'
        );
      }
      throw error;
    }
  }

  // Generates random GDP multiplier between 1000 and 2000
  private static generateRandomMultiplier(): number {
    return Math.random() * (2000 - 1000) + 1000;
  }

  private static calculateEstimatedGdp(
    population: number,
    exchangeRate: number | null
  ): number | null {
    if (exchangeRate === null || exchangeRate === 0) {
      return null;
    }

    const multiplier = this.generateRandomMultiplier();
    return (population * multiplier) / exchangeRate;
  }

  // Transforms API data to database format
  private static transformCountryData(
    country: CountryApiResponse,
    exchangeRates: Record<string, number>
  ): CountryData {
    const currencyCode =
      country.currencies && country.currencies.length > 0 ? country.currencies[0].code : null;

    const exchangeRate = currencyCode
      ? ExchangeRateService.getExchangeRate(exchangeRates, currencyCode)
      : null;

    const estimatedGdp =
      currencyCode && exchangeRate
        ? this.calculateEstimatedGdp(country.population, exchangeRate)
        : currencyCode
          ? null
          : 0;

    return {
      name: country.name,
      capital: country.capital || null,
      region: country.region || null,
      population: country.population,
      currencyCode,
      exchangeRate,
      estimatedGdp,
      flagUrl: country.flag || null,
    };
  }

  static async refreshCountries(): Promise<{
    updated: number;
    inserted: number;
  }> {
    try {
      const [countriesApiData, exchangeRates] = await Promise.all([
        this.fetchCountriesFromApi(),
        ExchangeRateService.fetchExchangeRates(),
      ]);

      let updated = 0;
      let inserted = 0;
      const refreshAt = new Date();

      console.log(
        `[${new Date().toISOString()}] Processing ${countriesApiData.length} countries...`
      );

      const BATCH_SIZE = 50;

      for (let i = 0; i < countriesApiData.length; i += BATCH_SIZE) {
        const batch = countriesApiData.slice(i, i + BATCH_SIZE);

        for (const countryApi of batch) {
          const data = this.transformCountryData(countryApi, exchangeRates);
          const commonData = {
            ...data,
            lastRefreshedAt: refreshAt,
          };

          const existingCountry = await prisma.country.findFirst({
            where: {
              name: {
                equals: data.name,
              },
            },
          });

          if (existingCountry) {
            await prisma.country.update({
              where: { id: existingCountry.id },
              data: commonData,
            });
            updated++;
          } else {
            await prisma.country.create({
              data: commonData,
            });
            inserted++;
          }
        }

        console.log(
          `[${new Date().toISOString()}] Processed ${Math.min(i + BATCH_SIZE, countriesApiData.length)}/${countriesApiData.length} countries`
        );
      }

      // Update system status
      const totalCountries = await prisma.country.count();
      await prisma.systemStatus.upsert({
        where: { id: 1 },
        create: {
          lastRefreshedAt: refreshAt,
          totalCountries,
        },
        update: {
          lastRefreshedAt: refreshAt,
          totalCountries,
        },
      });

      console.log(
        `[${new Date().toISOString()}] Refresh complete: ${inserted} inserted, ${updated} updated`
      );

      setImmediate(() => {
        void (async () => {
          try {
            console.log(`[${new Date().toISOString()}] Starting background image generation...`);
            await ImageGeneratorService.generateSummaryImage();
            console.log(`[${new Date().toISOString()}] Background image generation completed`);
          } catch (imageError) {
            console.error(
              `[${new Date().toISOString()}] Warning: Failed to generate summary image:`,
              imageError
            );
          }
        })();
      });

      return { updated, inserted };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error refreshing countries:', error);
      throw new AppError(500, 'Internal server error');
    }
  }

  static async getAllCountries(filters: FilterOptions): Promise<CountryResponse[]> {
    try {
      const whereClause: {
        region?: { equals: string };
        currencyCode?: { equals: string };
      } = {};

      // Apply filters
      if (filters.region) {
        whereClause.region = {
          equals: filters.region,
        };
      }

      if (filters.currency) {
        whereClause.currencyCode = {
          equals: filters.currency,
        };
      }

      // Apply sorting
      let orderBy:
        | { name: 'asc' | 'desc' }
        | { estimatedGdp: 'asc' | 'desc' }
        | { population: 'asc' | 'desc' } = { name: 'asc' };

      if (filters.sort) {
        switch (filters.sort) {
          case 'gdp_asc':
            orderBy = { estimatedGdp: 'asc' };
            break;
          case 'gdp_desc':
            orderBy = { estimatedGdp: 'desc' };
            break;
          case 'population_asc':
            orderBy = { population: 'asc' };
            break;
          case 'population_desc':
            orderBy = { population: 'desc' };
            break;
          case 'name_asc':
            orderBy = { name: 'asc' };
            break;
          case 'name_desc':
            orderBy = { name: 'desc' };
            break;
        }
      }

      const countries = await prisma.country.findMany({
        where: whereClause,
        orderBy,
      });

      return countries.map((c) => this.formatCountryResponse(c));
    } catch (error) {
      console.error('Error getting countries:', error);
      throw new AppError(500, 'Internal server error');
    }
  }

  static async getCountryByName(name: string): Promise<CountryResponse> {
    try {
      const country = await prisma.country.findFirst({
        where: {
          name: {
            equals: name,
          },
        },
      });

      if (!country) {
        throw new AppError(404, 'Country not found');
      }

      return this.formatCountryResponse(country);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error getting country:', error);
      throw new AppError(500, 'Internal server error');
    }
  }

  static async deleteCountry(name: string): Promise<void> {
    try {
      const country = await prisma.country.findFirst({
        where: {
          name: {
            equals: name,
          },
        },
      });

      if (!country) {
        throw new AppError(404, 'Country not found');
      }

      await prisma.country.delete({
        where: { id: country.id },
      });

      const totalCountries = await prisma.country.count();
      await prisma.systemStatus.update({
        where: { id: 1 },
        data: { totalCountries },
      });

      console.log(`[${new Date().toISOString()}] Deleted country: ${name}`);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error deleting country:', error);
      throw new AppError(500, 'Internal server error');
    }
  }

  static async getStatus(): Promise<{
    total_countries: number;
    last_refreshed_at: string;
  }> {
    try {
      const status = await prisma.systemStatus.findUnique({
        where: { id: 1 },
      });

      if (!status) {
        return {
          total_countries: 0,
          last_refreshed_at: new Date().toISOString(),
        };
      }

      return {
        total_countries: status.totalCountries,
        last_refreshed_at: status.lastRefreshedAt.toISOString(),
      };
    } catch (error) {
      console.error('Error getting status:', error);
      throw new AppError(500, 'Internal server error');
    }
  }

  private static formatCountryResponse(country: {
    id: number;
    name: string;
    capital: string | null;
    region: string | null;
    population: bigint;
    currencyCode: string | null;
    exchangeRate: number | null;
    estimatedGdp: number | null;
    flagUrl: string | null;
    lastRefreshedAt: Date;
  }): CountryResponse {
    return {
      id: country.id,
      name: country.name,
      capital: country.capital,
      region: country.region,
      population: Number(country.population),
      currency_code: country.currencyCode,
      exchange_rate: country.exchangeRate,
      estimated_gdp: country.estimatedGdp,
      flag_url: country.flagUrl,
      last_refreshed_at: country.lastRefreshedAt.toISOString(),
    };
  }
}
