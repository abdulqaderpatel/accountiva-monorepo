import { describe, it, expect } from 'vitest';
import { itemSchema } from './validation';

describe('itemSchema validation', () => {
  it('validates a valid inventory product with opening stock 0', () => {
    const res = itemSchema.safeParse({
      name: 'Wireless Mouse',
      type: 'Product',
      productType: 'Inventory',
      sellingPrice: 500,
      costPrice: 250,
      openingStock: 0,
      valuationRate: 200,
      asOfDate: '2026-10-27',
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.name).toBe('Wireless Mouse');
      expect(res.data.type).toBe('Product');
      expect(res.data.productType).toBe('Inventory');
      expect(res.data.openingStock).toBe(0);
      expect(res.data.valuationRate).toBe(200);
    }
  });

  it('normalizes uppercase or lowercase type and productType', () => {
    const res = itemSchema.safeParse({
      name: 'Ergonomic Chair',
      type: 'PRODUCT',
      productType: 'INVENTORY',
      openingStock: '15',
      valuationRate: '₹ 1,500',
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.type).toBe('Product');
      expect(res.data.productType).toBe('Inventory');
      expect(res.data.openingStock).toBe(15);
      expect(res.data.valuationRate).toBe(1500);
    }
  });

  it('tolerates currency prefixes and commas in numeric fields', () => {
    const res = itemSchema.safeParse({
      name: 'USB-C Cable',
      type: 'Product',
      sellingPrice: '₹ 499.00',
      costPrice: '₹ 199.50',
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.sellingPrice).toBe(499);
      expect(res.data.costPrice).toBe(199.5);
    }
  });

  it('fails with a descriptive error when name is missing', () => {
    const res = itemSchema.safeParse({
      name: '',
      type: 'Product',
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      const nameIssue = res.error.issues.find((i) => i.path[0] === 'name');
      expect(nameIssue).toBeDefined();
      expect(nameIssue?.message).toBe('Item name is required');
    }
  });

  it('fails with a descriptive error when openingStock is missing for inventory products', () => {
    const res = itemSchema.safeParse({
      name: 'Inventory Item',
      type: 'Product',
      productType: 'Inventory',
      openingStock: undefined,
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      const stockIssue = res.error.issues.find((i) => i.path[0] === 'openingStock');
      expect(stockIssue).toBeDefined();
      expect(stockIssue?.message).toBe('Opening Stock Quantity is required for inventory products');
    }
  });

  it('allows services without opening stock or product type', () => {
    const res = itemSchema.safeParse({
      name: 'Software Consulting',
      type: 'SERVICE',
      sellingPrice: 10000,
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.type).toBe('Service');
    }
  });
});
