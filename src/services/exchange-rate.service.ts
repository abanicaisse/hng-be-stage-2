import axios, { AxiosError } from 'axios';
import { ExchangeRateApiResponse, AppError } from '../types';

export class ExchangeRateService {
  private static readonly API_URL =
    process.env.EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest/USD';
  private static readonly TIMEOUT = parseInt(process.env.API_TIMEOUT || '10000');

  static async fetchExchangeRates(): Promise<Record<string, number>> {
    try {
      console.log(`[${new Date().toISOString()}] Fetching exchange rates...`);

      const response = await axios.get<ExchangeRateApiResponse>(this.API_URL, {
        timeout: this.TIMEOUT,
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.data.result !== 'success') {
        throw new Error('Exchange rate API returned unsuccessful result');
      }

      console.log(
        `[${new Date().toISOString()}] Successfully fetched ${Object.keys(response.data.rates).length} exchange rates`
      );

      return response.data.rates;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error('Exchange Rate API Error:', {
          message: axiosError.message,
          code: axiosError.code,
          status: axiosError.response?.status,
        });

        throw new AppError(
          503,
          'External data source unavailable',
          'Could not fetch data from Exchange Rate API'
        );
      }
      throw error;
    }
  }

  //  Gets exchange rate for a specific currency code
  static getExchangeRate(rates: Record<string, number>, currencyCode: string): number | null {
    return rates[currencyCode] || null;
  }
}
