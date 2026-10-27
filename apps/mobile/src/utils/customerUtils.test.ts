import { describe, expect, it } from 'vitest';
import { extractCustomerId, formatAddress, matchesCustomer } from './customerUtils';

describe('customerUtils helpers', () => {
  describe('formatAddress', () => {
    it('returns empty string for null, undefined, or empty string', () => {
      expect(formatAddress(null)).toBe('');
      expect(formatAddress(undefined)).toBe('');
      expect(formatAddress('')).toBe('');
    });

    it('returns trimmed string for normal address strings', () => {
      expect(formatAddress(' 123 MG Road, Bengaluru ')).toBe('123 MG Road, Bengaluru');
    });

    it('parses JSON string encoded address objects safely', () => {
      const jsonAddr = JSON.stringify({
        street: '456 Brigade Rd',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560025',
      });
      expect(formatAddress(jsonAddr)).toBe('456 Brigade Rd, Bengaluru, Karnataka, 560025');
    });

    it('formats plain object addresses without crashing', () => {
      const addrObj = {
        addressLine1: 'Suite 200',
        city: 'Mumbai',
        state: 'MH',
        country: 'India',
      };
      expect(formatAddress(addrObj)).toBe('Suite 200, Mumbai, MH, India');
    });

    it('handles numeric input safely', () => {
      expect(formatAddress(12345)).toBe('12345');
    });
  });

  describe('extractCustomerId', () => {
    it('extracts customerId from various property layouts', () => {
      expect(extractCustomerId({ customerId: 'cust-1' })).toBe('cust-1');
      expect(extractCustomerId({ customer_id: 'cust-2' })).toBe('cust-2');
      expect(extractCustomerId({ customer: { id: 'cust-3' } })).toBe('cust-3');
      expect(extractCustomerId({ customers: { id: 'cust-4' } })).toBe('cust-4');
    });

    it('returns empty string when no customer ID is present or input is invalid', () => {
      expect(extractCustomerId(null)).toBe('');
      expect(extractCustomerId(undefined)).toBe('');
      expect(extractCustomerId({})).toBe('');
      expect(extractCustomerId('invalid')).toBe('');
    });
  });

  describe('matchesCustomer', () => {
    it('matches when customer is an object without throwing TypeError: toLowerCase is not a function', () => {
      const estimateWithCustomerObject = {
        id: 'est-1',
        customer: { id: 'cust-100', name: 'Acme Industries' },
      };

      // When matching by customer ID
      expect(matchesCustomer(estimateWithCustomerObject, 'cust-100', 'Acme Industries')).toBe(true);

      // When matching by name substring (case-insensitive)
      expect(matchesCustomer(estimateWithCustomerObject, '', 'acme')).toBe(true);

      // Non-matching customer
      expect(matchesCustomer(estimateWithCustomerObject, 'cust-999', 'Other Corp')).toBe(false);
    });

    it('matches when customer is a string', () => {
      const invoiceWithStringCustomer = {
        id: 'inv-1',
        customerId: 'cust-200',
        customer: 'Stark Enterprises',
      };

      expect(matchesCustomer(invoiceWithStringCustomer, 'cust-200', 'Stark Enterprises')).toBe(true);
      expect(matchesCustomer(invoiceWithStringCustomer, '', 'stark')).toBe(true);
    });

    it('matches when customerName or customers.name is present', () => {
      const recordWithCustomerName = {
        id: 'rec-1',
        customerName: 'Wayne Corp',
      };
      expect(matchesCustomer(recordWithCustomerName, '', 'wayne')).toBe(true);

      const recordWithCustomersRel = {
        id: 'rec-2',
        customers: { id: 'cust-300', name: 'Wayne Corp' },
      };
      expect(matchesCustomer(recordWithCustomersRel, 'cust-300', 'wayne')).toBe(true);
    });

    it('gracefully handles missing, null, or invalid data without throwing', () => {
      expect(matchesCustomer(null, 'c1', 'test')).toBe(false);
      expect(matchesCustomer(undefined, 'c1', 'test')).toBe(false);
      expect(matchesCustomer({}, 'c1', 'test')).toBe(false);
      expect(matchesCustomer({ customer: null }, 'c1', 'test')).toBe(false);
      expect(matchesCustomer({ customer: 12345 }, 'c1', 'test')).toBe(false);
    });
  });
});

