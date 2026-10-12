export interface CountryOption {
  code: string;
  name: string;
  currency: string;
  flag?: string;
}

export const COUNTRIES: CountryOption[] = [
  { code: "IN", name: "India", currency: "INR", flag: "🇮🇳" },
  { code: "US", name: "United States", currency: "USD", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", currency: "GBP", flag: "🇬🇧" },
  { code: "AE", name: "United Arab Emirates", currency: "AED", flag: "🇦🇪" },
  { code: "CA", name: "Canada", currency: "CAD", flag: "🇨🇦" },
  { code: "AU", name: "Australia", currency: "AUD", flag: "🇦🇺" },
  { code: "SG", name: "Singapore", currency: "SGD", flag: "🇸🇬" },
  { code: "DE", name: "Germany", currency: "EUR", flag: "🇩🇪" },
  { code: "FR", name: "France", currency: "EUR", flag: "🇫🇷" },
  { code: "SA", name: "Saudi Arabia", currency: "SAR", flag: "🇸🇦" },
  { code: "QA", name: "Qatar", currency: "QAR", flag: "🇶🇦" },
  { code: "OM", name: "Oman", currency: "OMR", flag: "🇴🇲" },
  { code: "KW", name: "Kuwait", currency: "KWD", flag: "🇰🇼" },
  { code: "BH", name: "Bahrain", currency: "BHD", flag: "🇧🇭" },
  { code: "ZA", name: "South Africa", currency: "ZAR", flag: "🇿🇦" },
  { code: "NZ", name: "New Zealand", currency: "NZD", flag: "🇳🇿" },
  { code: "IE", name: "Ireland", currency: "EUR", flag: "🇮🇪" },
  { code: "NL", name: "Netherlands", currency: "EUR", flag: "🇳🇱" },
  { code: "CH", name: "Switzerland", currency: "CHF", flag: "🇨🇭" },
  { code: "JP", name: "Japan", currency: "JPY", flag: "🇯🇵" },
  { code: "CN", name: "China", currency: "CNY", flag: "🇨🇳" },
  { code: "HK", name: "Hong Kong", currency: "HKD", flag: "🇭🇰" },
  { code: "MY", name: "Malaysia", currency: "MYR", flag: "🇲🇾" },
  { code: "ID", name: "Indonesia", currency: "IDR", flag: "🇮🇩" },
  { code: "PH", name: "Philippines", currency: "PHP", flag: "🇵🇭" },
  { code: "TH", name: "Thailand", currency: "THB", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", currency: "VND", flag: "🇻🇳" },
  { code: "KR", name: "South Korea", currency: "KRW", flag: "🇰🇷" },
  { code: "BR", name: "Brazil", currency: "BRL", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", currency: "MXN", flag: "🇲🇽" },
  { code: "ES", name: "Spain", currency: "EUR", flag: "🇪🇸" },
  { code: "IT", name: "Italy", currency: "EUR", flag: "🇮🇹" },
  { code: "SE", name: "Sweden", currency: "SEK", flag: "🇸🇪" },
  { code: "NO", name: "Norway", currency: "NOK", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", currency: "DKK", flag: "🇩🇰" },
  { code: "FI", name: "Finland", currency: "EUR", flag: "🇫🇮" },
  { code: "PL", name: "Poland", currency: "PLN", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", currency: "EUR", flag: "🇵🇹" },
  { code: "AT", name: "Austria", currency: "EUR", flag: "🇦🇹" },
  { code: "BE", name: "Belgium", currency: "EUR", flag: "🇧🇪" },
  { code: "EG", name: "Egypt", currency: "EGP", flag: "🇪🇬" },
  { code: "NG", name: "Nigeria", currency: "NGN", flag: "NGN" },
  { code: "KE", name: "Kenya", currency: "KES", flag: "🇰🇪" },
  { code: "LK", name: "Sri Lanka", currency: "LKR", flag: "🇱🇰" },
  { code: "BD", name: "Bangladesh", currency: "BDT", flag: "🇧🇩" },
  { code: "NP", name: "Nepal", currency: "NPR", flag: "🇳🇵" },
  { code: "PK", name: "Pakistan", currency: "PKR", flag: "🇵🇰" },
  { code: "TR", name: "Turkey", currency: "TRY", flag: "🇹🇷" },
  { code: "OTHER", name: "Other Country", currency: "USD", flag: "🌐" },
];

export const getCountryByName = (name?: string): CountryOption | undefined => {
  if (!name) return undefined;
  const normalized = name.trim().toLowerCase();
  return COUNTRIES.find((c) => c.name.toLowerCase() === normalized || c.code.toLowerCase() === normalized);
};
