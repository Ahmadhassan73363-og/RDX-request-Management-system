// Real-time Forex Currency Rate Service
// Connects to public open exchange rate API to fetch real-time conversions for GBP

export interface ExchangeRatesData {
  base: string;
  rates: {
    USD: number;
    EUR: number;
    AED: number;
    [key: string]: number;
  };
  timestamp: string;
}

export type LedgerCurrencyCode = 'GBP' | 'USD' | 'EUR' | 'AED' | 'CAD';

// Normalizes whatever a request/company has stored as its currency (a proper
// ISO code like 'USD', or a legacy symbol like '$' from older records) down to
// one of the codes the live FX rates are quoted for. Falls back to GBP — the
// rates' own base — for anything unrecognized, so callers always get a valid
// key into ExchangeRatesData.rates.
export function normalizeLedgerCurrency(raw?: string): LedgerCurrencyCode {
  if (raw === 'USD' || raw === '$') return 'USD';
  if (raw === 'EUR' || raw === '€') return 'EUR';
  if (raw === 'AED' || raw === 'د.إ') return 'AED';
  if (raw === 'CAD') return 'CAD';
  return 'GBP';
}

const STORAGE_KEY = 'rdx_live_fx_rates';

// Standard fallback rates in case client is offline or network fails
const DEFAULT_FALLBACK_RATES: ExchangeRatesData = {
  base: 'GBP',
  rates: {
    USD: 1.32,
    EUR: 1.16,
    AED: 4.85,
    CAD: 1.80,
    AUD: 1.95
  },
  timestamp: new Date().toISOString()
};

class CurrencyService {
  private cachedRates: ExchangeRatesData | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.cachedRates = JSON.parse(stored);
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(data: ExchangeRatesData) {
    this.cachedRates = data;
    this.lastFetchTime = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Fetches real-time currency rates with GBP as base currency.
   * Targets open.er-api.com, with fallbacks if unavailable.
   */
  public async getLiveRates(forceRefresh = false): Promise<ExchangeRatesData> {
    const now = Date.now();
    if (!forceRefresh && this.cachedRates && (now - this.lastFetchTime < this.CACHE_TTL_MS)) {
      return this.cachedRates;
    }

    try {
      const response = await fetch('https://open.er-api.com/v6/latest/GBP');
      if (!response.ok) {
        throw new Error(`API error ${response.status}`);
      }
      const data = await response.json();
      if (data && data.rates) {
        const ratesData: ExchangeRatesData = {
          base: 'GBP',
          rates: {
            USD: Number(data.rates.USD) || 1.32,
            EUR: Number(data.rates.EUR) || 1.16,
            AED: Number(data.rates.AED) || 4.85,
            CAD: Number(data.rates.CAD) || 1.80,
            AUD: Number(data.rates.AUD) || 1.95,
            ...data.rates
          },
          timestamp: data.time_last_update_utc || new Date().toISOString()
        };
        this.saveToStorage(ratesData);
        return ratesData;
      }
    } catch (err) {
      console.warn('[CurrencyService] Live API fetch failed, trying secondary fallback...', err);
      // Secondary fallback endpoint
      try {
        const fallbackResp = await fetch('https://api.exchangerate-api.com/v4/latest/GBP');
        if (fallbackResp.ok) {
          const fallbackData = await fallbackResp.json();
          if (fallbackData && fallbackData.rates) {
            const ratesData: ExchangeRatesData = {
              base: 'GBP',
              rates: {
                USD: Number(fallbackData.rates.USD) || 1.32,
                EUR: Number(fallbackData.rates.EUR) || 1.16,
                AED: Number(fallbackData.rates.AED) || 4.85,
                ...fallbackData.rates
              },
              timestamp: new Date().toISOString()
            };
            this.saveToStorage(ratesData);
            return ratesData;
          }
        }
      } catch {
        // Fall through to cached or default rates
      }
    }

    return this.cachedRates || DEFAULT_FALLBACK_RATES;
  }

  /**
   * Synchronously returns cached rates or defaults (for immediate UI rendering).
   */
  public getCachedRates(): ExchangeRatesData {
    return this.cachedRates || DEFAULT_FALLBACK_RATES;
  }

  /**
   * Converts an amount FROM its own native currency INTO its GBP equivalent,
   * using the given (or cached) rates. Rates are quoted as "units of X per 1
   * GBP", so going the other way — native currency back to GBP — divides
   * rather than multiplies.
   */
  public toGbp(amount: number, nativeCurrency: LedgerCurrencyCode, ratesData?: ExchangeRatesData): number {
    if (nativeCurrency === 'GBP') return amount;
    const data = ratesData || this.getCachedRates();
    const rate = data.rates[nativeCurrency] || 1;
    return amount / rate;
  }

  /**
   * Converts a given GBP amount into USD, EUR, and AED.
   */
  public convertGbp(
    amountGbp: number,
    ratesData?: ExchangeRatesData
  ): {
    usd: number;
    eur: number;
    aed: number;
    usdRate: number;
    eurRate: number;
    aedRate: number;
    timestamp: string;
  } {
    const data = ratesData || this.getCachedRates();
    const usdRate = data.rates.USD || 1.32;
    const eurRate = data.rates.EUR || 1.16;
    const aedRate = data.rates.AED || 4.85;

    return {
      usd: Math.round(amountGbp * usdRate * 100) / 100,
      eur: Math.round(amountGbp * eurRate * 100) / 100,
      aed: Math.round(amountGbp * aedRate * 100) / 100,
      usdRate,
      eurRate,
      aedRate,
      timestamp: data.timestamp
    };
  }
}

export const currencyService = new CurrencyService();
