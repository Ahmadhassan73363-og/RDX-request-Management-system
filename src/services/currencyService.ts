// Currency Rate Service
//
// Primary source: HMRC monthly exchange rates, published by the UK Trade Tariff
// service as one public CSV per month ("Currency Units per £1"). A request is
// converted to GBP at the HMRC rate for the month of its request date, and that
// rate is saved with the request so the figure never drifts afterwards.
//
// Fallback only (HMRC unreachable / month unpublished): open.er-api.com live rates.

export type RateSource = 'HMRC' | 'open.er-api.com' | 'exchangerate-api.com' | 'default';

export interface ExchangeRatesData {
  base: string;
  rates: {
    USD: number;
    EUR: number;
    AED: number;
    [key: string]: number;
  };
  /** When the rates were fetched (or, for live APIs, last updated). */
  timestamp: string;
  source?: RateSource;
  /** HMRC only: the month the rates are valid for, e.g. "October 2026". */
  period?: string;
  /** HMRC only: "YYYY-M" key of the month the rates are valid for. */
  periodKey?: string;
}

// What gets saved on a request (customFields.fxSnapshot) so its conversion is auditable.
export interface FxSnapshot {
  currency: string;
  /** Units of `currency` per £1 — the rate used. */
  rate: number;
  source: RateSource;
  period?: string;
  fetchedAt: string;
}

export const SOURCE_LABELS: Record<RateSource, string> = {
  HMRC: 'HMRC monthly exchange rates',
  'open.er-api.com': 'open.er-api.com live market rate (HMRC unavailable)',
  'exchangerate-api.com': 'exchangerate-api.com live market rate (HMRC unavailable)',
  default: 'built-in default rate (HMRC and live APIs unavailable)'
};

export const describeRateSource = (source: RateSource, period?: string): string =>
  source === 'HMRC' && period ? `${SOURCE_LABELS.HMRC} — ${period}` : SOURCE_LABELS[source];

export type LedgerCurrencyCode = 'GBP' | 'USD' | 'EUR' | 'AED' | 'CAD';

// Normalizes whatever a request/company has stored as its currency (a proper
// ISO code like 'USD', or a legacy symbol like '$' from older records) down to
// one of the codes the rates are quoted for. Falls back to GBP — the rates' own
// base — for anything unrecognized, so callers always get a valid key into
// ExchangeRatesData.rates.
export function normalizeLedgerCurrency(raw?: string): LedgerCurrencyCode {
  if (raw === 'USD' || raw === '$') return 'USD';
  if (raw === 'EUR' || raw === '€') return 'EUR';
  if (raw === 'AED' || raw === 'د.إ') return 'AED';
  if (raw === 'CAD') return 'CAD';
  return 'GBP';
}

const LIVE_STORAGE_KEY = 'rdx_live_fx_rates';
const HMRC_STORAGE_KEY = 'rdx_hmrc_fx_rates_v1';
const HMRC_CURRENT_MONTH_TTL_MS = 24 * 60 * 60 * 1000;
const HMRC_WALK_BACK_MONTHS = 3;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const hmrcCsvUrl = (year: number, month: number) =>
  `https://www.trade-tariff.service.gov.uk/api/v2/exchange_rates/files/monthly_csv_${year}-${month}.csv`;

// Last-resort rates in case the client is offline and nothing is cached.
const DEFAULT_FALLBACK_RATES: ExchangeRatesData = {
  base: 'GBP',
  rates: {
    USD: 1.32,
    EUR: 1.16,
    AED: 4.85,
    CAD: 1.80,
    AUD: 1.95
  },
  timestamp: new Date().toISOString(),
  source: 'default'
};

// Splits one CSV line, honouring double-quoted fields.
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else { quoted = !quoted; }
    } else if (ch === ',' && !quoted) {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells.map(c => c.trim());
}

// Parses an HMRC monthly CSV ("Country,Currency,Currency Code,Currency Units per £1,Start date,End date").
export function parseHmrcCsv(text: string, year: number, month: number): ExchangeRatesData | null {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return null;
  const header = splitCsvLine(lines[0]).map(h => h.toLowerCase());
  const codeIdx = header.findIndex(h => h === 'currency code');
  const rateIdx = header.findIndex(h => h.startsWith('currency units per'));
  if (codeIdx === -1 || rateIdx === -1) return null;

  const rates: Record<string, number> = {};
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const code = (cells[codeIdx] || '').toUpperCase();
    const rate = parseFloat(cells[rateIdx]);
    // Several territories share a currency with the same rate; first row wins.
    if (/^[A-Z]{3}$/.test(code) && rate > 0 && !(code in rates)) rates[code] = rate;
  }
  if (!rates.USD || !rates.EUR) return null;

  return {
    base: 'GBP',
    rates: rates as ExchangeRatesData['rates'],
    timestamp: new Date().toISOString(),
    source: 'HMRC',
    period: `${MONTH_NAMES[month - 1]} ${year}`,
    periodKey: `${year}-${month}`
  };
}

class CurrencyService {
  private cachedRates: ExchangeRatesData | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // live-rate cache: 10 minutes
  private hmrcCache: Record<string, ExchangeRatesData> = {};
  private hmrcInFlight: Record<string, Promise<ExchangeRatesData | null>> = {};
  private hmrcMissing = new Set<string>(); // months HMRC answered 404 for, this session

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(LIVE_STORAGE_KEY);
      if (stored) this.cachedRates = JSON.parse(stored);
    } catch {
      // Ignore storage errors
    }
    try {
      const stored = localStorage.getItem(HMRC_STORAGE_KEY);
      if (stored) this.hmrcCache = JSON.parse(stored);
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(data: ExchangeRatesData) {
    this.cachedRates = data;
    this.lastFetchTime = Date.now();
    try {
      localStorage.setItem(LIVE_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  private saveHmrc(key: string, data: ExchangeRatesData) {
    this.hmrcCache[key] = data;
    try {
      localStorage.setItem(HMRC_STORAGE_KEY, JSON.stringify(this.hmrcCache));
    } catch {
      // Ignore storage errors
    }
  }

  /** Is a cached HMRC month still good? Past months never change; current/future ones refresh daily. */
  private isHmrcFresh(data: ExchangeRatesData, year: number, month: number): boolean {
    const now = new Date();
    const isPastMonth = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
    if (isPastMonth) return true;
    return Date.now() - new Date(data.timestamp).getTime() < HMRC_CURRENT_MONTH_TTL_MS;
  }

  /** Fetches (or returns cached) HMRC rates for one month. Null if HMRC hasn't published it / is unreachable. */
  public async getHmrcRates(year: number, month: number): Promise<ExchangeRatesData | null> {
    const key = `${year}-${month}`;
    const cached = this.hmrcCache[key];
    if (cached && this.isHmrcFresh(cached, year, month)) return cached;
    if (this.hmrcMissing.has(key)) return cached || null;
    if (key in this.hmrcInFlight) return this.hmrcInFlight[key];

    this.hmrcInFlight[key] = (async () => {
      try {
        const res = await fetch(hmrcCsvUrl(year, month), { headers: { Accept: 'text/csv' } });
        if (res.status === 404) {
          this.hmrcMissing.add(key);
          return cached || null;
        }
        if (!res.ok) throw new Error(`HMRC rates HTTP ${res.status}`);
        const parsed = parseHmrcCsv(await res.text(), year, month);
        if (!parsed) throw new Error('HMRC rates file could not be parsed');
        this.saveHmrc(key, parsed);
        return parsed;
      } catch (err) {
        console.warn(`[CurrencyService] HMRC rates for ${key} unavailable:`, err);
        return cached || null; // stale-but-real beats nothing
      } finally {
        delete this.hmrcInFlight[key];
      }
    })();
    return this.hmrcInFlight[key];
  }

  /**
   * The rates a request dated `dateStr` (YYYY-MM-DD, default today) should be converted at:
   * HMRC's rate for that month; if that month isn't published yet, the most recent published
   * month before it; only if HMRC is unreachable altogether, the live market rate.
   */
  public async getRatesForDate(dateStr?: string): Promise<ExchangeRatesData> {
    const d = dateStr && /^\d{4}-\d{2}/.test(dateStr) ? new Date(dateStr + (dateStr.length === 7 ? '-01' : '')) : new Date();
    let year = isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
    let month = isNaN(d.getTime()) ? new Date().getMonth() + 1 : d.getMonth() + 1;

    for (let i = 0; i <= HMRC_WALK_BACK_MONTHS; i++) {
      const hmrc = await this.getHmrcRates(year, month);
      if (hmrc) return hmrc;
      month -= 1;
      if (month === 0) { month = 12; year -= 1; }
    }
    return this.getLiveRates();
  }

  /** Synchronous twin of getRatesForDate for callers that can't await: whatever is already cached. */
  public getCachedRatesForDate(dateStr?: string): ExchangeRatesData {
    const d = dateStr && /^\d{4}-\d{2}/.test(dateStr) ? new Date(dateStr + (dateStr.length === 7 ? '-01' : '')) : new Date();
    let year = isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
    let month = isNaN(d.getTime()) ? new Date().getMonth() + 1 : d.getMonth() + 1;
    for (let i = 0; i <= HMRC_WALK_BACK_MONTHS; i++) {
      const hit = this.hmrcCache[`${year}-${month}`];
      if (hit) return hit;
      month -= 1;
      if (month === 0) { month = 12; year -= 1; }
    }
    return this.getCachedRates();
  }

  /**
   * Fallback: live market rates with GBP as base (open.er-api.com, then exchangerate-api.com).
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
          timestamp: data.time_last_update_utc || new Date().toISOString(),
          source: 'open.er-api.com'
        };
        this.saveToStorage(ratesData);
        return ratesData;
      }
    } catch (err) {
      console.warn('[CurrencyService] Live API fetch failed, trying secondary fallback...', err);
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
              timestamp: new Date().toISOString(),
              source: 'exchangerate-api.com'
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
   * Synchronously returns the cached live rates or defaults.
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
}

export const currencyService = new CurrencyService();
