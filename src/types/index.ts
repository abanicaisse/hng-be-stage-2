export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface CountryApiResponse {
  name: string;
  capital?: string;
  region?: string;
  population: number;
  flag?: string;
  currencies?: Currency[];
}

export interface ExchangeRateApiResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
}

export interface CountryData {
  name: string;
  capital: string | null;
  region: string | null;
  population: number;
  currencyCode: string | null;
  exchangeRate: number | null;
  estimatedGdp: number | null;
  flagUrl: string | null;
}

export interface CountryResponse {
  id: number;
  name: string;
  capital: string | null;
  region: string | null;
  population: number;
  currency_code: string | null;
  exchange_rate: number | null;
  estimated_gdp: number | null;
  flag_url: string | null;
  last_refreshed_at: string;
}

export interface FilterOptions {
  region?: string;
  currency?: string;
  sort?:
    | "gdp_asc"
    | "gdp_desc"
    | "population_asc"
    | "population_desc"
    | "name_asc"
    | "name_desc";
}

export interface StatusResponse {
  total_countries: number;
  last_refreshed_at: string;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
