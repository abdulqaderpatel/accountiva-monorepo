import { describe, expect, it } from 'vitest';
import {
  parseAndValidateCsv,
  ENTITY_TEMPLATES,
  generateCsvContent,
} from '@accountiva/shared';

describe('Mobile CSV Import - Customers & Items', () => {
  describe('Customer CSV Import', () => {
    it('parses multi-row customer CSV and formats payload correctly for bulk-import', () => {
      const csv = [
        'Customer Name,Customer Code,Email,Phone,GST Number',
        'Acme Corp,CUST-001,billing@acme.com,9876543210,29AABCU9603R1ZM',
        'Wayne Tech,CUST-002,contact@waynetech.com,9123456780,',
      ].join('\n');

      const result = parseAndValidateCsv(csv, 'customers');
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(2);
      expect(result.invalidRows).toBe(0);

      expect(result.payload).toHaveLength(2);
      expect(result.payload[0]).toMatchObject({
        name: 'Acme Corp',
        customerCode: 'CUST-001',
        email: 'billing@acme.com',
        phone: '9876543210',
        gstNumber: '29AABCU9603R1ZM',
      });
      expect(result.payload[1]).toMatchObject({
        name: 'Wayne Tech',
        customerCode: 'CUST-002',
        email: 'contact@waynetech.com',
        phone: '9123456780',
      });
    });

    it('identifies invalid customer rows missing required name', () => {
      const csv = [
        'Customer Name,Email,Phone',
        ',missing@name.com,9876543210',
        'Valid Client,valid@client.com,9123456780',
      ].join('\n');

      const result = parseAndValidateCsv(csv, 'customers');
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(1);
      expect(result.invalidRows).toBe(1);
      expect(result.rows[0].isValid).toBe(false);
      expect(result.rows[0].errors[0]).toContain('Customer Name is required');
      expect(result.rows[1].isValid).toBe(true);
    });
  });

  describe('Item CSV Import', () => {
    it('parses multi-row item CSV with products and services and formats payload correctly', () => {
      const csv = [
        'Item Name,SKU,Type,Selling Price,Cost Price,Opening Stock',
        'MacBook Pro Stand,SKU-MBP-01,Product,2500,1200,45',
        'Consulting Hourly,SRV-CON-01,Service,1500,0,0',
      ].join('\n');

      const result = parseAndValidateCsv(csv, 'items');
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(2);
      expect(result.invalidRows).toBe(0);

      expect(result.payload).toHaveLength(2);
      expect(result.payload[0]).toMatchObject({
        name: 'MacBook Pro Stand',
        sku: 'SKU-MBP-01',
        type: 'Product',
        sellingPrice: '2500',
        costPrice: '1200',
        openingStock: '45',
      });
      expect(result.payload[1]).toMatchObject({
        name: 'Consulting Hourly',
        sku: 'SRV-CON-01',
        type: 'Service',
        sellingPrice: '1500',
        costPrice: '0',
      });
    });

    it('identifies invalid item rows missing required item name', () => {
      const csv = [
        'Item Name,SKU,Selling Price',
        ',SKU-EMPTY,100',
        'Good Widget,SKU-GOOD,250',
      ].join('\n');

      const result = parseAndValidateCsv(csv, 'items');
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(1);
      expect(result.invalidRows).toBe(1);
      expect(result.rows[0].isValid).toBe(false);
      expect(result.rows[0].errors[0]).toContain('Item Name is required');
      expect(result.rows[1].isValid).toBe(true);
    });
  });

  describe('CSV Templates', () => {
    it('generates non-empty customer template with sample data', () => {
      const config = ENTITY_TEMPLATES['customers'];
      expect(config).toBeDefined();
      const content = generateCsvContent(config.headers, config.sampleRows);
      expect(content).toContain('Customer Name');
      expect(content).toContain('Acme Corporation');
    });

    it('generates non-empty item template with sample data', () => {
      const config = ENTITY_TEMPLATES['items'];
      expect(config).toBeDefined();
      const content = generateCsvContent(config.headers, config.sampleRows);
      expect(content).toContain('Item Name');
      expect(content).toContain('Selling Price');
      expect(content).toContain('SRV-WEB-01');
    });
  });
});
