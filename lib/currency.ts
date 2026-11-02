export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  rateToUSD: number; // 1 unit of foreign currency = X USD
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: "USD", name: "US Dollar", symbol: "$", rateToUSD: 1.0 },
  EUR: { code: "EUR", name: "Euro", symbol: "€", rateToUSD: 1.08 },
  GBP: { code: "GBP", name: "British Pound", symbol: "£", rateToUSD: 1.28 },
  CAD: { code: "CAD", name: "Canadian Dollar", symbol: "CA$", rateToUSD: 0.73 },
  JPY: { code: "JPY", name: "Japanese Yen", symbol: "¥", rateToUSD: 0.0067 },
  SGD: { code: "SGD", name: "Singapore Dollar", symbol: "S$", rateToUSD: 0.76 },
  AUD: { code: "AUD", name: "Australian Dollar", symbol: "A$", rateToUSD: 0.65 },
  CHF: { code: "CHF", name: "Swiss Franc", symbol: "CHF", rateToUSD: 1.12 },
  KHR: { code: "KHR", name: "Cambodian Riel", symbol: "៛", rateToUSD: 0.000247 },
  VND: { code: "VND", name: "Vietnamese Dong", symbol: "₫", rateToUSD: 0.00004 },
  MYR: { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", rateToUSD: 0.23 },
  IDR: { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", rateToUSD: 0.000065 },
  PHP: { code: "PHP", name: "Philippine Peso", symbol: "₱", rateToUSD: 0.018 },
};

export const DEFAULT_CURRENCY = "USD";

/**
 * Converts an amount from one currency to another using fixed benchmark rates.
 */
export function convertCurrency(
  amount: number,
  fromCurrency = "USD",
  toCurrency = "USD"
): number {
  if (fromCurrency === toCurrency) return amount;

  const fromInfo = SUPPORTED_CURRENCIES[fromCurrency] || SUPPORTED_CURRENCIES.USD;
  const toInfo = SUPPORTED_CURRENCIES[toCurrency] || SUPPORTED_CURRENCIES.USD;

  // Convert from source to USD, then from USD to target
  const amountInUSD = amount * fromInfo.rateToUSD;
  const targetAmount = amountInUSD / toInfo.rateToUSD;

  return Number(targetAmount.toFixed(2));
}

/**
 * Formats a currency value with the appropriate locale and symbol.
 */
export function formatCurrencyWithCode(
  amount: number,
  currency = "USD"
): string {
  const safeCurrency = SUPPORTED_CURRENCIES[currency] ? currency : "USD";
  const isZeroDecimal = ["JPY", "VND", "IDR", "KHR"].includes(safeCurrency);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
      maximumFractionDigits: isZeroDecimal ? 0 : 2,
    }).format(amount);
  } catch {
    const symbol = SUPPORTED_CURRENCIES[safeCurrency]?.symbol || "$";
    return `${symbol}${isZeroDecimal ? Math.round(amount) : amount.toFixed(2)}`;
  }
}
