import { describe, it, expect } from "vitest";
import { parseAndValidateCsv, resolveHeaderMapping } from "./csvParser";

describe("csvParser - Customer Import & Header Resolution", () => {
  it("resolves headers correctly without prefix collisions (GST Treatment vs GST Number)", () => {
    const headers = [
      "Customer Name",
      "Email",
      "Phone",
      "GST Treatment",
      "Payment Terms"
    ];

    const mapping = resolveHeaderMapping(headers, "customers");
    expect(mapping.get(0)).toBe("name");
    expect(mapping.get(1)).toBe("email");
    expect(mapping.get(2)).toBe("phone");
    expect(mapping.get(3)).toBe("gstTreatment"); // NOT gstNumber!
    expect(mapping.get(4)).toBe("paymentTerms");
  });

  it("resolves Customer ID or Code correctly without overriding Customer Name", () => {
    const headers = [
      "Customer ID",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "GSTIN",
      "GST Treatment"
    ];

    const mapping = resolveHeaderMapping(headers, "customers");
    expect(mapping.get(0)).toBe("customerCode");
    expect(mapping.get(1)).toBe("name");
    expect(mapping.get(2)).toBe("email");
    expect(mapping.get(3)).toBe("phone");
    expect(mapping.get(4)).toBe("gstNumber");
    expect(mapping.get(5)).toBe("gstTreatment");
  });

  it("successfully parses 9 distinct customers without contaminating gstNumber from gstTreatment", () => {
    const csv = `Customer Name,Email,Phone,GST Treatment
Cust 1,c1@a.com,111,Consumer
Cust 2,c2@a.com,222,Consumer
Cust 3,c3@a.com,333,Consumer
Cust 4,c4@a.com,444,Consumer
Cust 5,c5@a.com,555,Consumer
Cust 6,c6@a.com,666,Consumer
Cust 7,c7@a.com,777,Consumer
Cust 8,c8@a.com,888,Consumer
Cust 9,c9@a.com,999,Consumer`;

    const result = parseAndValidateCsv(csv, "customers");
    expect(result.totalRows).toBe(9);
    expect(result.validRows).toBe(9);
    expect(result.invalidRows).toBe(0);
    expect(result.payload.length).toBe(9);

    result.payload.forEach((item, idx) => {
      expect(item.name).toBe(`Cust ${idx + 1}`);
      expect(item.email).toBe(`c${idx + 1}@a.com`);
      expect(item.gstTreatment).toBe("Consumer");
      // Critical check: gstNumber must not be "Consumer"
      expect(item.gstNumber).toBeFalsy();
    });
  });

  it("strips placeholder and treatment values mistakenly placed in gstNumber", () => {
    const csv = `Customer Name,Email,Phone,GST Number
Cust 1,c1@a.com,111,Consumer
Cust 2,c2@a.com,222,N/A
Cust 3,c3@a.com,333,29AABCU9603R1ZM`;

    const result = parseAndValidateCsv(csv, "customers");
    expect(result.validRows).toBe(3);
    expect(result.payload[0].gstTreatment).toBe("Consumer");
    expect(result.payload[0].gstNumber).toBe("");
    expect(result.payload[1].gstNumber).toBe("");
    expect(result.payload[2].gstNumber).toBe("29AABCU9603R1ZM");
  });

  it("resolves item and vendor headers without collisions (Unit vs Unit Price, Bank vs Bank Account No)", () => {
    const itemHeaders = ["Item Name", "Item Code", "Unit", "Unit Price", "Cost Price"];
    const itemMapping = resolveHeaderMapping(itemHeaders, "items");
    expect(itemMapping.get(0)).toBe("name");
    expect(itemMapping.get(1)).toBe("sku");
    expect(itemMapping.get(2)).toBe("uom");
    expect(itemMapping.get(3)).toBe("sellingPrice");
    expect(itemMapping.get(4)).toBe("costPrice");

    const vendorHeaders = ["Vendor Name", "Bank Name", "Bank Account Number", "Bank IFSC"];
    const vendorMapping = resolveHeaderMapping(vendorHeaders, "vendors");
    expect(vendorMapping.get(0)).toBe("name");
    expect(vendorMapping.get(1)).toBe("bankName");
    expect(vendorMapping.get(2)).toBe("bankAccountNo");
    expect(vendorMapping.get(3)).toBe("bankIfsc");
  });
});

