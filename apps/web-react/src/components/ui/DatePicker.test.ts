import { describe, it, expect } from "vitest";
import {
  parseDateValue,
  formatDateString,
  getDecadeBounds,
  MONTHS,
  SHORT_MONTHS,
  DAYS_OF_WEEK,
} from "./DatePicker";

describe("DatePicker Logic & Utilities", () => {
  describe("parseDateValue", () => {
    it("returns null for empty or undefined input", () => {
      expect(parseDateValue("")).toBeNull();
      expect(parseDateValue(null)).toBeNull();
      expect(parseDateValue(undefined)).toBeNull();
    });

    it("correctly parses YYYY-MM-DD without UTC timezone offsets", () => {
      const date = parseDateValue("2025-04-15");
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2025);
      expect(date?.getMonth()).toBe(3); // 0-indexed April
      expect(date?.getDate()).toBe(15);
    });

    it("correctly handles year-end and leap days", () => {
      const leap = parseDateValue("2024-02-29");
      expect(leap?.getDate()).toBe(29);
      expect(leap?.getMonth()).toBe(1);

      const yearEnd = parseDateValue("2026-12-31");
      expect(yearEnd?.getFullYear()).toBe(2026);
      expect(yearEnd?.getMonth()).toBe(11);
      expect(yearEnd?.getDate()).toBe(31);
    });
  });

  describe("formatDateString", () => {
    it("formats year, month, day into padded YYYY-MM-DD", () => {
      expect(formatDateString(2025, 3, 5)).toBe("2025-04-05");
      expect(formatDateString(2026, 11, 25)).toBe("2026-12-25");
      expect(formatDateString(2024, 0, 1)).toBe("2024-01-01");
    });
  });

  describe("getDecadeBounds", () => {
    it("computes 10-year decade range and 12-cell grid", () => {
      const bounds2025 = getDecadeBounds(2025);
      expect(bounds2025.start).toBe(2020);
      expect(bounds2025.end).toBe(2029);
      expect(bounds2025.years).toHaveLength(12);
      expect(bounds2025.years[0]).toBe(2019);
      expect(bounds2025.years[bounds2025.years.length - 1]).toBe(2030);

      const bounds1999 = getDecadeBounds(1999);
      expect(bounds1999.start).toBe(1990);
      expect(bounds1999.end).toBe(1999);
      expect(bounds1999.years[1]).toBe(1990);
    });
  });

  describe("Constants", () => {
    it("has 7 days of the week", () => {
      expect(DAYS_OF_WEEK).toHaveLength(7);
      expect(DAYS_OF_WEEK[0]).toBe("Su");
    });

    it("has 12 months with matching short versions", () => {
      expect(MONTHS).toHaveLength(12);
      expect(SHORT_MONTHS).toHaveLength(12);
      expect(MONTHS[3]).toBe("April");
      expect(SHORT_MONTHS[3]).toBe("Apr");
    });
  });
});
