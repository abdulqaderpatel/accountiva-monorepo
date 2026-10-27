export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

export const REGION_OPTIONS = [
  { value: "India", label: "India" },
  { value: "Other", label: "Other" },
];

export const COMMON_CURRENCIES: CurrencyOption[] = [
  { code: "INR", symbol: "₹", label: "INR (₹) - Indian Rupee" },
  { code: "USD", symbol: "$", label: "USD ($) - US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR (€) - Euro" },
  { code: "GBP", symbol: "£", label: "GBP (£) - British Pound" },
  { code: "AED", symbol: "د.إ", label: "AED (د.إ) - UAE Dirham" },
  { code: "CAD", symbol: "$", label: "CAD ($) - Canadian Dollar" },
  { code: "AUD", symbol: "$", label: "AUD ($) - Australian Dollar" },
  { code: "SGD", symbol: "$", label: "SGD ($) - Singapore Dollar" },
  { code: "JPY", symbol: "¥", label: "JPY (¥) - Japanese Yen" },
  { code: "SAR", symbol: "﷼", label: "SAR (﷼) - Saudi Riyal" },
  { code: "QAR", symbol: "﷼", label: "QAR (﷼) - Qatari Riyal" },
  { code: "OMR", symbol: "﷼", label: "OMR (﷼) - Omani Rial" },
  { code: "KWD", symbol: "د.ك", label: "KWD (د.ك) - Kuwaiti Dinar" },
  { code: "BHD", symbol: "د.ب", label: "BHD (د.ب) - Bahraini Dinar" },
  { code: "ZAR", symbol: "R", label: "ZAR (R) - South African Rand" },
  { code: "NZD", symbol: "$", label: "NZD ($) - New Zealand Dollar" },
  { code: "HKD", symbol: "$", label: "HKD ($) - Hong Kong Dollar" },
  { code: "CHF", symbol: "CHF", label: "CHF (CHF) - Swiss Franc" },
  { code: "CNY", symbol: "¥", label: "CNY (¥) - Chinese Yuan" },
];

export const INDUSTRY_TYPES = [
  "SaaS & Tech",
  "Retail & E-commerce",
  "Manufacturing",
  "Professional Services",
  "Healthcare",
  "Construction",
  "Hospitality",
  "Wholesale & Distribution",
  "Financial Services",
  "Education",
  "Media & Entertainment",
  "Other",
];

export interface IndianState {
  code: string;
  name: string;
  label: string;
}

export const INDIAN_STATES: IndianState[] = [
  { code: "01", name: "Jammu and Kashmir", label: "01 - Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh", label: "02 - Himachal Pradesh" },
  { code: "03", name: "Punjab", label: "03 - Punjab" },
  { code: "04", name: "Chandigarh", label: "04 - Chandigarh" },
  { code: "05", name: "Uttarakhand", label: "05 - Uttarakhand" },
  { code: "06", name: "Haryana", label: "06 - Haryana" },
  { code: "07", name: "Delhi", label: "07 - Delhi" },
  { code: "08", name: "Rajasthan", label: "08 - Rajasthan" },
  { code: "09", name: "Uttar Pradesh", label: "09 - Uttar Pradesh" },
  { code: "10", name: "Bihar", label: "10 - Bihar" },
  { code: "11", name: "Sikkim", label: "11 - Sikkim" },
  { code: "12", name: "Arunachal Pradesh", label: "12 - Arunachal Pradesh" },
  { code: "13", name: "Nagaland", label: "13 - Nagaland" },
  { code: "14", name: "Manipur", label: "14 - Manipur" },
  { code: "15", name: "Mizoram", label: "15 - Mizoram" },
  { code: "16", name: "Tripura", label: "16 - Tripura" },
  { code: "17", name: "Meghalaya", label: "17 - Meghalaya" },
  { code: "18", name: "Assam", label: "18 - Assam" },
  { code: "19", name: "West Bengal", label: "19 - West Bengal" },
  { code: "20", name: "Jharkhand", label: "20 - Jharkhand" },
  { code: "21", name: "Odisha", label: "21 - Odisha" },
  { code: "22", name: "Chhattisgarh", label: "22 - Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh", label: "23 - Madhya Pradesh" },
  { code: "24", name: "Gujarat", label: "24 - Gujarat" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu", label: "26 - Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", name: "Maharashtra", label: "27 - Maharashtra" },
  { code: "29", name: "Karnataka", label: "29 - Karnataka" },
  { code: "30", name: "Goa", label: "30 - Goa" },
  { code: "31", name: "Lakshadweep", label: "31 - Lakshadweep" },
  { code: "32", name: "Kerala", label: "32 - Kerala" },
  { code: "33", name: "Tamil Nadu", label: "33 - Tamil Nadu" },
  { code: "34", name: "Puducherry", label: "34 - Puducherry" },
  { code: "35", name: "Andaman and Nicobar Islands", label: "35 - Andaman and Nicobar Islands" },
  { code: "36", name: "Telangana", label: "36 - Telangana" },
  { code: "37", name: "Andhra Pradesh", label: "37 - Andhra Pradesh" },
  { code: "38", name: "Ladakh", label: "38 - Ladakh" },
  { code: "97", name: "Other Territory", label: "97 - Other Territory" },
];

export interface OrganizationAddressPayload {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  state_code?: string | null;
  postal_code?: string | null;
  address?: string | null;
}

export function formatOrganizationAddress(org: OrganizationAddressPayload): string {
  if (org.address_line1 || org.city || org.state || org.postal_code) {
    const line1 = org.address_line1?.trim() || "";
    const line2 = org.address_line2?.trim() || "";
    const cityStateZip = [
      org.city?.trim(),
      org.state?.trim(),
      org.postal_code?.trim()
    ].filter(Boolean).join(", ");

    return [line1, line2, cityStateZip].filter(Boolean).join("\n");
  }
  return org.address?.trim() || "";
}

/**
 * Strips district/city, state, PIN code, and country suffixes from Address Line 1
 * when they are populated in their own dedicated address fields.
 */
export function sanitizeAddressLine1(
  rawAddress: string | null | undefined,
  context: {
    city?: string | null | undefined;
    state?: string | null | undefined;
    postal_code?: string | null | undefined;
    pincode?: string | null | undefined;
    country?: string | null | undefined;
  } = {}
): string {
  if (!rawAddress || typeof rawAddress !== "string") return "";
  let addr = rawAddress.trim();

  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const pin = (context.pincode || context.postal_code || "").trim();
  const state = (context.state || "").trim();
  const city = (context.city || "").trim();
  const country = (context.country || "").trim();

  const termsToRemove: string[] = [];

  if (pin) {
    const cleanPin = pin.replace(/\s+/g, "");
    if (cleanPin.length === 6) {
      termsToRemove.push(`(?:(?:PIN(?:\\s*code)?|Postal\\s*code)?\\s*[:#-]?\\s*)?${cleanPin.slice(0, 3)}[\\s-]?${cleanPin.slice(3)}`);
    } else {
      termsToRemove.push(`(?:(?:PIN(?:\\s*code)?|Postal\\s*code)?\\s*[:#-]?\\s*)?${esc(pin)}`);
    }
  }
  // Generic Indian PIN code (e.g. 401208 or 401 208)
  termsToRemove.push(`(?:(?:PIN(?:\\s*code)?|Postal\\s*code)?\\s*[:#-]?\\s*)?\\b\\d{3}[\\s-]?\\d{3}\\b`);
  // Dangling PIN/Postal label
  termsToRemove.push(`(?:PIN(?:\\s*code)?|Postal\\s*code)\\s*[:#-]?`);

  if (country) {
    termsToRemove.push(esc(country));
  }
  termsToRemove.push("(?:India|IN)");

  if (state) {
    const cleanState = state.replace(/^\d{2}\s*-\s*/, "").replace(/^\d{2}\s*/, "").trim();
    if (cleanState) {
      termsToRemove.push(`(?:State\\s*[:#-]?\\s*)?${esc(cleanState)}`);
    }
    if (state !== cleanState) {
      termsToRemove.push(`(?:State\\s*[:#-]?\\s*)?${esc(state)}`);
    }
  }

  if (city) {
    termsToRemove.push(`(?:Dist(?:t|rict)?\\.?\\s*[:#-]?\\s*|City\\s*[:#-]?\\s*)?${esc(city)}(?:\\s*Dist(?:t|rict)?\\.?)?`);
  }

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 12) {
    iterations++;
    changed = false;
    const trimmed = addr.replace(/[\s,.:;/#-]+$/, "");
    if (trimmed !== addr) {
      addr = trimmed;
      changed = true;
    }

    for (const term of termsToRemove) {
      const pattern = new RegExp(`(?:[\\s,.:;/#-]+|^)(?:\\()?(${term})(?:\\))?$`, "i");
      if (pattern.test(addr)) {
        addr = addr.replace(pattern, "").trim();
        changed = true;
      }
    }
  }

  return addr.replace(/[\s,.:;/#-]+$/, "").trim();
}
