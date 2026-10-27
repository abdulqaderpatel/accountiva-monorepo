import { describe, it, expect } from "vitest";
import { sanitizeAddressLine1, formatOrganizationAddress } from "./organization";

describe("sanitizeAddressLine1", () => {
  it("omits district, state, and pincode from address line 1 (user screenshot case)", () => {
    const raw = "JSTRIAL COMPLEX MORIYA NAKA SATIVALI VASAI Palghar Maharashtra 401208";
    const cleaned = sanitizeAddressLine1(raw, {
      city: "Palghar",
      state: "27 - Maharashtra",
      postal_code: "401208",
    });
    expect(cleaned).toBe("JSTRIAL COMPLEX MORIYA NAKA SATIVALI VASAI");
  });

  it("handles commas, hyphens, and state codes", () => {
    const raw = "Plot 14, MIDC, Andheri East, Mumbai, Maharashtra - 400093, India";
    const cleaned = sanitizeAddressLine1(raw, {
      city: "Mumbai",
      state: "Maharashtra",
      postal_code: "400093",
      country: "India",
    });
    expect(cleaned).toBe("Plot 14, MIDC, Andheri East");
  });

  it("handles Dist. prefix and PIN prefix variations", () => {
    const raw1 = "Shop 5, Galaxy Mall, Station Road, Dist. Palghar, Maharashtra, PIN: 401208";
    const cleaned1 = sanitizeAddressLine1(raw1, {
      city: "Palghar",
      state: "27 - Maharashtra",
      postal_code: "401208",
    });
    expect(cleaned1).toBe("Shop 5, Galaxy Mall, Station Road");

    const raw2 = "Shop 5, Galaxy Mall, Station Road, Dist: Palghar, Maharashtra - PIN-401208";
    const cleaned2 = sanitizeAddressLine1(raw2, {
      city: "Palghar",
      state: "Maharashtra",
      pincode: "401208",
    });
    expect(cleaned2).toBe("Shop 5, Galaxy Mall, Station Road");
  });

  it("preserves premise names when they start with a city name", () => {
    const raw = "Delhi Gate, Asaf Ali Road, New Delhi, Delhi 110002";
    const cleaned = sanitizeAddressLine1(raw, {
      city: "New Delhi",
      state: "07 - Delhi",
      postal_code: "110002",
    });
    expect(cleaned).toBe("Delhi Gate, Asaf Ali Road");
  });

  it("handles spaced Indian pincodes (e.g., 401 208)", () => {
    const raw = "Flat 102, Sunrise Towers, Vasai East, Palghar, Maharashtra 401 208";
    const cleaned = sanitizeAddressLine1(raw, {
      city: "Palghar",
      state: "27 - Maharashtra",
      postal_code: "401208",
    });
    expect(cleaned).toBe("Flat 102, Sunrise Towers, Vasai East");
  });

  it("handles empty or null rawAddress gracefully", () => {
    expect(sanitizeAddressLine1("")).toBe("");
    expect(sanitizeAddressLine1(null)).toBe("");
    expect(sanitizeAddressLine1(undefined)).toBe("");
  });

  it("handles address without trailing district/state/pincode without altering it", () => {
    const raw = "123 Tech Park, Phase 1";
    expect(
      sanitizeAddressLine1(raw, {
        city: "Pune",
        state: "Maharashtra",
        postal_code: "411057",
      })
    ).toBe("123 Tech Park, Phase 1");
  });
});

describe("formatOrganizationAddress", () => {
  it("formats multi-line address correctly", () => {
    const formatted = formatOrganizationAddress({
      address_line1: "Line 1",
      city: "Palghar",
      state: "Maharashtra",
      postal_code: "401208",
    });
    expect(formatted).toBe("Line 1\nPalghar, Maharashtra, 401208");
  });
});
