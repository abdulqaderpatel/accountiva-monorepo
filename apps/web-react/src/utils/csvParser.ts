/**
 * RFC 4180 Compliant CSV Parser and Entity Validator
 */

export interface ParsedRowResult {
  rowIndex: number;
  rawData: Record<string, string>;
  mappedData: Record<string, any>;
  isValid: boolean;
  errors: string[];
}

export interface CsvParseResult {
  headers: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: ParsedRowResult[];
  payload: any[]; // Formatted payload ready for backend bulk-import API
}

/**
 * Splits raw CSV text into an array of row arrays, honoring quotes and escapes
 */
export function parseRawCsv(text: string): string[][] {
  const cleanText = text.replace(/^\uFEFF/, ''); // Strip BOM
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped double quote
          currentCell += '"';
          i++;
        } else {
          // Closing quote
          insideQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++; // Skip \n in CRLF
        currentRow.push(currentCell.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  // Push final trailing cell/row if present
  currentRow.push(currentCell.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Normalizes header string to clean lowercase token
 */
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Field alias mappings for each entity
 */
const ENTITY_ALIASES: Record<string, Record<string, string[]>> = {
  customers: {
    name: ['customername', 'name', 'clientname', 'displayname', 'customer'],
    customerCode: ['customercode', 'code', 'customerid'],
    email: ['email', 'emailid', 'customeremail'],
    phone: ['phone', 'mobile', 'phonenumber', 'mobilenumber', 'contact', 'contactnumber'],
    company: ['companyname', 'company', 'organization', 'businessname'],
    billingAddress: ['billingaddress', 'billingaddr', 'address', 'billingaddressline', 'street', 'streetaddress'],
    shippingAddress: ['shippingaddress', 'shippingaddr', 'deliveryaddress', 'shipaddress', 'mailingaddress'],
    gstNumber: ['gstnumber', 'gstin', 'gst', 'taxid'],
    gstTreatment: ['gsttreatment', 'treatment', 'taxtreatment'],
    paymentTerms: ['paymentterms', 'terms'],
    openingBalance: ['openingbalance', 'balance'],
    notes: ['notes', 'remarks', 'description']
  },

  vendors: {
    name: ['vendorname', 'name', 'suppliername', 'supplier', 'vendor'],
    vendorCode: ['vendorcode', 'code', 'vendorid'],
    email: ['email', 'emailid', 'vendoremail'],
    phone: ['phone', 'mobile', 'phonenumber', 'contact'],
    company: ['companyname', 'company', 'organization'],
    address: ['address', 'street', 'location'],
    gstNumber: ['gstnumber', 'gstin', 'gst'],
    gstTreatment: ['gsttreatment', 'treatment'],
    paymentTerms: ['paymentterms', 'terms'],
    bankName: ['bankname', 'bank'],
    bankAccountNo: ['bankaccountnumber', 'bankaccountno', 'accountno', 'accountnumber'],
    bankIfsc: ['bankifsc', 'ifsc', 'ifsccode'],
    openingBalance: ['openingbalance', 'balance'],
    notes: ['notes', 'remarks']
  },

  items: {
    name: ['itemname', 'name', 'productname', 'servicename', 'item', 'title'],
    sku: ['sku', 'itemcode', 'code', 'barcode'],
    type: ['type', 'itemtype'],
    productType: ['classification', 'producttype', 'inventorytype', 'trackinventory', 'itemclassification'],
    openingStock: ['openingstock', 'initialstock', 'stockonhand', 'stock', 'openingquantity', 'currentstock', 'quantityinstock'],
    reorderPoint: ['reorderpoint', 'reorderlevel', 'reorder', 'lowstockthreshold', 'lowstocklevel', 'minimumstock'],
    category: ['category', 'group'],
    uom: ['unitofmeasurement', 'uom', 'unit', 'units'],
    sellingPrice: ['sellingprice', 'price', 'unitprice', 'rate', 'salesprice'],
    costPrice: ['costprice', 'cost', 'purchaseprice'],
    salesTaxRate: ['salestaxrate', 'salestax', 'taxrate', 'taxpercent', 'gst'],
    purchaseTaxRate: ['purchasetaxrate', 'purchasetax'],
    hsnSacCode: ['hsnorsaccode', 'hsnsaccode', 'hsncode', 'saccode', 'hsn', 'sac'],
    taxPreference: ['taxpreference', 'preference'],
    description: ['description', 'salesdescription', 'details']
  },

  invoices: {
    invoiceNumber: ['invoicenumber', 'invoiceno', 'invoice', 'invnumber', 'invno'],
    customerName: ['customername', 'customer', 'client', 'name'],
    customerEmail: ['customeremail', 'email', 'emailid'],
    date: ['invoicedate', 'date'],
    dueDate: ['duedate', 'expirydate'],
    itemName: ['itemname', 'item', 'product', 'service', 'description'],
    quantity: ['quantity', 'qty'],
    rate: ['rate', 'price', 'unitprice', 'itemprice'],
    itemDescription: ['itemdescription', 'description', 'lineitemdescription'],
    referenceNumber: ['referencenumber', 'refno', 'ponumber', 'orderid'],
    discountPercent: ['discount', 'discountpercent', 'discountvalue'],
    taxPercent: ['tax', 'taxpercent', 'vat', 'gst'],
    notes: ['notes', 'remarks', 'termsconditions']
  },

  bills: {
    billNumber: ['billnumber', 'billno', 'bill', 'invoice#', 'vendorinvoiceno'],
    vendorName: ['vendorname', 'vendor', 'supplier', 'name'],
    vendorEmail: ['vendoremail', 'email'],
    date: ['billdate', 'date'],
    dueDate: ['duedate'],
    itemName: ['itemname', 'item', 'description'],
    quantity: ['quantity', 'qty'],
    rate: ['rate', 'price', 'unitprice'],
    itemDescription: ['itemdescription', 'description'],
    referenceNumber: ['referencenumber', 'refno', 'ponumber'],
    taxPercent: ['tax', 'taxpercent'],
    notes: ['notes', 'remarks']
  },

  expenses: {
    date: ['date', 'expensedate'],
    expenseAccount: ['expenseaccount', 'account', 'category'],
    amount: ['amount', 'total', 'cost'],
    paidThrough: ['paidthrough', 'paidvia', 'paymentaccount', 'paymentmode'],
    vendor: ['vendorname', 'vendor', 'payee'],
    referenceNumber: ['referencenumber', 'refno', 'receiptno'],
    notes: ['notes', 'description', 'remarks']
  }
};

/**
 * Maps raw CSV row cells to normalized schema keys
 */
function mapRowToSchema(
  headerKeys: string[],
  cells: string[],
  entityKey: string
): { rawData: Record<string, string>; mappedData: Record<string, any> } {
  const rawData: Record<string, string> = {};
  const mappedData: Record<string, any> = {};
  const aliases = ENTITY_ALIASES[entityKey] || {};

  headerKeys.forEach((header, idx) => {
    const rawValue = cells[idx] || '';
    rawData[header] = rawValue;

    const normH = normalizeHeader(header);
    for (const [targetKey, aliasList] of Object.entries(aliases)) {
      if (aliasList.some((alias) => normH === alias || normH.startsWith(alias))) {
        if (mappedData[targetKey] === undefined) {
          mappedData[targetKey] = rawValue;
        }
      }
    }
  });

  return { rawData, mappedData };
}

/**
 * Validates mapped data for a single row
 */
function validateMappedRow(mapped: Record<string, any>, entityKey: string): string[] {
  const errors: string[] = [];

  switch (entityKey) {
    case 'customers':
      if (!mapped.name?.trim()) errors.push('Customer Name is required');
      if (mapped.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email)) {
        errors.push('Invalid email format');
      }
      break;

    case 'vendors':
      if (!mapped.name?.trim()) errors.push('Vendor Name is required');
      if (mapped.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email)) {
        errors.push('Invalid email format');
      }
      break;

    case 'items':
      if (!mapped.name?.trim()) errors.push('Item Name is required');
      if (mapped.sellingPrice !== undefined && mapped.sellingPrice !== '') {
        const p = Number(mapped.sellingPrice);
        if (isNaN(p) || p < 0) errors.push('Selling Price must be a positive number');
      }
      if (mapped.openingStock !== undefined && mapped.openingStock !== '') {
        const os = Number(mapped.openingStock);
        if (isNaN(os) || os < 0) errors.push('Opening Stock must be a non-negative number');
      }
      if (mapped.reorderPoint !== undefined && mapped.reorderPoint !== '') {
        const rp = Number(mapped.reorderPoint);
        if (isNaN(rp) || rp < 0) errors.push('Reorder Point must be a non-negative number');
      }
      break;

    case 'invoices':
      if (!mapped.customerName?.trim()) errors.push('Customer Name is required');
      if (!mapped.itemName?.trim()) errors.push('Item Name is required');
      if (mapped.quantity !== undefined && (isNaN(Number(mapped.quantity)) || Number(mapped.quantity) <= 0)) {
        errors.push('Quantity must be greater than 0');
      }
      if (mapped.rate !== undefined && (isNaN(Number(mapped.rate)) || Number(mapped.rate) < 0)) {
        errors.push('Rate must be a non-negative number');
      }
      break;

    case 'bills':
      if (!mapped.vendorName?.trim()) errors.push('Vendor Name is required');
      if (!mapped.itemName?.trim()) errors.push('Item Name is required');
      if (mapped.quantity !== undefined && (isNaN(Number(mapped.quantity)) || Number(mapped.quantity) <= 0)) {
        errors.push('Quantity must be greater than 0');
      }
      if (mapped.rate !== undefined && (isNaN(Number(mapped.rate)) || Number(mapped.rate) < 0)) {
        errors.push('Rate must be a non-negative number');
      }
      break;

    case 'expenses':
      if (!mapped.expenseAccount?.trim()) errors.push('Expense Account is required');
      if (!mapped.paidThrough?.trim()) errors.push('Paid Through is required');
      if (!mapped.amount || isNaN(Number(mapped.amount)) || Number(mapped.amount) <= 0) {
        errors.push('Amount must be a positive number');
      }
      break;
  }

  return errors;
}

/**
 * Parses raw CSV string and validates against target entity schema
 */
export function parseAndValidateCsv(csvText: string, entityKey: string): CsvParseResult {
  const matrix = parseRawCsv(csvText);
  if (matrix.length === 0) {
    return {
      headers: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      rows: [],
      payload: []
    };
  }

  const rawHeaders = matrix[0]!;
  const dataRows = matrix.slice(1);

  const parsedRows: ParsedRowResult[] = [];

  dataRows.forEach((cells, index) => {
    // Skip completely empty rows
    if (cells.every((c) => !c.trim())) return;

    const { rawData, mappedData } = mapRowToSchema(rawHeaders, cells, entityKey);
    const errors = validateMappedRow(mappedData, entityKey);

    parsedRows.push({
      rowIndex: index + 1,
      rawData,
      mappedData,
      isValid: errors.length === 0,
      errors
    });
  });

  const validRows = parsedRows.filter((r) => r.isValid).length;
  const invalidRows = parsedRows.length - validRows;

  // Build the ready-to-import payload
  let payload: any[] = [];
  if (entityKey === 'invoices') {
    // Group multi-line rows by invoiceNumber
    const grouped = new Map<string, any>();
    let fallbackCounter = 1;

    parsedRows.forEach((r) => {
      if (!r.isValid) return;
      const m = r.mappedData;
      const invNum = (m.invoiceNumber || '').trim() || `BULK-INV-${String(fallbackCounter++).padStart(3, '0')}`;

      if (!grouped.has(invNum)) {
        grouped.set(invNum, {
          invoiceNumber: invNum,
          customerName: m.customerName,
          customerEmail: m.customerEmail || '',
          date: m.date || new Date().toISOString().split('T')[0],
          dueDate: m.dueDate || null,
          referenceNumber: m.referenceNumber || '',
          discountPercent: Number(m.discountPercent || 0),
          taxPercent: Number(m.taxPercent || 0),
          notes: m.notes || '',
          items: []
        });
      }

      const inv = grouped.get(invNum)!;
      const qty = Number(m.quantity || 1);
      const rate = Number(m.rate || 0);
      inv.items.push({
        name: m.itemName,
        description: m.itemDescription || '',
        quantity: qty,
        rate: rate,
        amount: qty * rate
      });
    });

    // Calculate total amounts
    payload = Array.from(grouped.values()).map((inv) => {
      const subtotal = inv.items.reduce((s: number, i: any) => s + i.amount, 0);
      const discount = subtotal * (inv.discountPercent / 100);
      const afterDiscount = subtotal - discount;
      const tax = afterDiscount * (inv.taxPercent / 100);
      inv.amount = afterDiscount + tax;
      return inv;
    });
  } else if (entityKey === 'bills') {
    // Group multi-line rows by billNumber
    const grouped = new Map<string, any>();
    let fallbackCounter = 1;

    parsedRows.forEach((r) => {
      if (!r.isValid) return;
      const m = r.mappedData;
      const billNum = (m.billNumber || '').trim() || `BULK-BILL-${String(fallbackCounter++).padStart(3, '0')}`;

      if (!grouped.has(billNum)) {
        grouped.set(billNum, {
          billNumber: billNum,
          vendorName: m.vendorName,
          vendorEmail: m.vendorEmail || '',
          date: m.date || new Date().toISOString().split('T')[0],
          dueDate: m.dueDate || null,
          referenceNumber: m.referenceNumber || '',
          taxPercent: Number(m.taxPercent || 0),
          notes: m.notes || '',
          items: []
        });
      }

      const bill = grouped.get(billNum)!;
      const qty = Number(m.quantity || 1);
      const rate = Number(m.rate || 0);
      bill.items.push({
        name: m.itemName,
        description: m.itemDescription || '',
        quantity: qty,
        rate: rate,
        amount: qty * rate
      });
    });

    payload = Array.from(grouped.values()).map((bill) => {
      const subtotal = bill.items.reduce((s: number, i: any) => s + i.amount, 0);
      const tax = subtotal * (bill.taxPercent / 100);
      bill.amount = subtotal + tax;
      return bill;
    });
  } else if (entityKey === 'customers') {
    // Sanitize common field values that may include label prefixes (e.g. "Phone: 123")
    payload = parsedRows.filter((r) => r.isValid).map((r) => {
      const m = { ...r.mappedData };
      if (typeof m.phone === 'string') {
        m.phone = m.phone.replace(/^phone\s*:\s*/i, '').replace(/^mobile\s*:\s*/i, '').trim();
      }
      if (typeof m.email === 'string') {
        m.email = m.email.replace(/^email\s*:\s*/i, '').trim();
      }
      return m;
    });
  } else {
    // Direct 1-to-1 rows (Vendors, Items, Expenses)
    payload = parsedRows.filter((r) => r.isValid).map((r) => r.mappedData);
  }

  return {
    headers: rawHeaders,
    totalRows: parsedRows.length,
    validRows,
    invalidRows,
    rows: parsedRows,
    payload
  };
}

