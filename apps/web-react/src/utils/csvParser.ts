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
export function normalizeHeader(h: string): string {
  let cleaned = (h || '').toLowerCase().trim();
  cleaned = cleaned.replace(/[\*\(\)\[\]]/g, ' ');
  cleaned = cleaned.replace(/\b(required|mandatory|optional)\b/g, '');
  return cleaned.replace(/[^a-z0-9]/g, '');
}

/**
 * Field alias mappings for each entity
 */
export const ENTITY_ALIASES: Record<string, Record<string, string[]>> = {
  customers: {
    name: [
      'customername',
      'name',
      'clientname',
      'displayname',
      'customer',
      'contactname',
      'companycustomer',
      'customerorcompany'
    ],
    customerCode: [
      'customercode',
      'code',
      'customerid',
      'customerno',
      'custid',
      'custcode',
      'customernumber'
    ],
    email: [
      'email',
      'emailid',
      'customeremail',
      'clientemail',
      'contactemail',
      'primarycontactemailid',
      'primarycontactemail'
    ],
    phone: [
      'phone',
      'mobile',
      'phonenumber',
      'mobilenumber',
      'contact',
      'contactnumber',
      'customerphone',
      'customermobile',
      'clientphone',
      'primarycontactmobile',
      'primarycontactphone',
      'telephone'
    ],
    company: [
      'companyname',
      'company',
      'organization',
      'businessname',
      'orgname'
    ],
    billingAddress: [
      'billingaddress',
      'billingaddr',
      'address',
      'billingaddressline',
      'street',
      'streetaddress',
      'billingstreet',
      'billingstreetaddress',
      'billaddress'
    ],
    shippingAddress: [
      'shippingaddress',
      'shippingaddr',
      'deliveryaddress',
      'shipaddress',
      'mailingaddress',
      'shippingstreet',
      'shippingstreetaddress'
    ],
    gstNumber: [
      'gstnumber',
      'gstin',
      'gst',
      'taxid',
      'gstno',
      'gstid',
      'taxnumber',
      'vatnumber',
      'gstidentificationnumber',
      'gstidentificationnumbergstin'
    ],
    gstTreatment: [
      'gsttreatment',
      'treatment',
      'taxtreatment',
      'gsttype',
      'taxtype'
    ],
    paymentTerms: [
      'paymentterms',
      'terms',
      'paymentterm'
    ],
    openingBalance: [
      'openingbalance',
      'balance',
      'openbalance'
    ],
    notes: [
      'notes',
      'remarks',
      'description',
      'note',
      'comment',
      'comments'
    ]
  },

  vendors: {
    name: [
      'vendorname',
      'name',
      'suppliername',
      'supplier',
      'vendor',
      'contactname',
      'payeename'
    ],
    vendorCode: [
      'vendorcode',
      'code',
      'vendorid',
      'vendorno',
      'supplierid',
      'suppliercode'
    ],
    email: [
      'email',
      'emailid',
      'vendoremail',
      'supplieremail',
      'primarycontactemail'
    ],
    phone: [
      'phone',
      'mobile',
      'phonenumber',
      'mobilenumber',
      'contact',
      'vendorphone',
      'supplierphone',
      'telephone'
    ],
    company: [
      'companyname',
      'company',
      'organization',
      'businessname',
      'orgname'
    ],
    address: [
      'address',
      'street',
      'location',
      'vendoraddress',
      'supplieraddress'
    ],
    gstNumber: [
      'gstnumber',
      'gstin',
      'gst',
      'taxid',
      'gstno',
      'taxnumber',
      'vatnumber',
      'gstidentificationnumber',
      'gstidentificationnumbergstin'
    ],
    gstTreatment: [
      'gsttreatment',
      'treatment',
      'taxtreatment',
      'gsttype'
    ],
    paymentTerms: [
      'paymentterms',
      'terms',
      'paymentterm'
    ],
    bankName: [
      'bankname',
      'bank'
    ],
    bankAccountNo: [
      'bankaccountnumber',
      'bankaccountno',
      'accountno',
      'accountnumber',
      'bankaccnumber',
      'bankaccno'
    ],
    bankIfsc: [
      'bankifsc',
      'ifsc',
      'ifsccode'
    ],
    openingBalance: [
      'openingbalance',
      'balance',
      'openbalance'
    ],
    notes: [
      'notes',
      'remarks',
      'description',
      'note',
      'comment',
      'comments'
    ]
  },

  items: {
    name: [
      'itemname',
      'productname',
      'servicename',
      'title',
      'item',
      'name'
    ],
    sku: [
      'sku',
      'itemcode',
      'code',
      'barcode',
      'productcode',
      'itemsku'
    ],
    type: [
      'type',
      'itemtype'
    ],
    productType: [
      'classification',
      'producttype',
      'inventorytype',
      'trackinventory',
      'itemclassification'
    ],
    openingStock: [
      'openingstock',
      'initialstock',
      'stockonhand',
      'stock',
      'openingquantity',
      'currentstock',
      'quantityinstock'
    ],
    reorderPoint: [
      'reorderpoint',
      'reorderlevel',
      'reorder',
      'lowstockthreshold',
      'lowstocklevel',
      'minimumstock'
    ],
    category: [
      'category',
      'group'
    ],
    uom: [
      'unitofmeasurement',
      'uom',
      'unit',
      'units',
      'usageunit'
    ],
    sellingPrice: [
      'sellingprice',
      'unitprice',
      'salesprice',
      'price',
      'rate',
      'itemprice'
    ],
    costPrice: [
      'costprice',
      'cost',
      'purchaseprice',
      'purchaserate'
    ],
    salesTaxRate: [
      'salestaxrate',
      'salestax',
      'taxrate',
      'taxpercent',
      'gst',
      'itemtaxpercent'
    ],
    purchaseTaxRate: [
      'purchasetaxrate',
      'purchasetax'
    ],
    hsnSacCode: [
      'hsnorsaccode',
      'hsnsaccode',
      'hsncode',
      'saccode',
      'hsn',
      'sac',
      'hsnsac'
    ],
    taxPreference: [
      'taxpreference',
      'preference'
    ],
    description: [
      'description',
      'salesdescription',
      'details',
      'itemdesc'
    ]
  },

  invoices: {
    invoiceNumber: [
      'invoicenumber',
      'invoiceno',
      'invoice',
      'invnumber',
      'invno'
    ],
    customerName: [
      'customername',
      'customer',
      'client',
      'name'
    ],
    customerEmail: [
      'customeremail',
      'email',
      'emailid',
      'primarycontactemailid'
    ],
    date: [
      'invoicedate',
      'date'
    ],
    dueDate: [
      'duedate',
      'expirydate'
    ],
    itemName: [
      'itemname',
      'product',
      'service',
      'item'
    ],
    quantity: [
      'quantity',
      'qty'
    ],
    rate: [
      'rate',
      'price',
      'unitprice',
      'itemprice'
    ],
    itemDescription: [
      'itemdescription',
      'description',
      'lineitemdescription',
      'itemdesc'
    ],
    referenceNumber: [
      'referencenumber',
      'refno',
      'ponumber',
      'orderid'
    ],
    discountPercent: [
      'discount',
      'discountpercent',
      'discountvalue'
    ],
    taxPercent: [
      'tax',
      'taxpercent',
      'vat',
      'gst'
    ],
    notes: [
      'notes',
      'remarks',
      'termsconditions'
    ]
  },

  bills: {
    billNumber: [
      'billnumber',
      'billno',
      'bill',
      'invoice#',
      'vendorinvoiceno'
    ],
    vendorName: [
      'vendorname',
      'vendor',
      'supplier',
      'name'
    ],
    vendorEmail: [
      'vendoremail',
      'email'
    ],
    date: [
      'billdate',
      'date'
    ],
    dueDate: [
      'duedate'
    ],
    itemName: [
      'itemname',
      'item',
      'description'
    ],
    quantity: [
      'quantity',
      'qty'
    ],
    rate: [
      'rate',
      'price',
      'unitprice'
    ],
    itemDescription: [
      'itemdescription',
      'description'
    ],
    referenceNumber: [
      'referencenumber',
      'refno',
      'ponumber'
    ],
    taxPercent: [
      'tax',
      'taxpercent'
    ],
    notes: [
      'notes',
      'remarks'
    ]
  },

  expenses: {
    date: [
      'date',
      'expensedate'
    ],
    expenseAccount: [
      'expenseaccount',
      'account',
      'category'
    ],
    amount: [
      'amount',
      'total',
      'cost'
    ],
    paidThrough: [
      'paidthrough',
      'paidvia',
      'paymentaccount',
      'paymentmode'
    ],
    vendor: [
      'vendorname',
      'vendor',
      'payee'
    ],
    referenceNumber: [
      'referencenumber',
      'refno',
      'receiptno'
    ],
    notes: [
      'notes',
      'description',
      'remarks'
    ]
  }
};

/**
 * Resolves each column index to a unique target schema key.
 * Phase 1: Exact alias match (normH === alias).
 * Phase 2: Longest alias prefix match (alias.length >= 4) for remaining unmapped columns.
 */
export function resolveHeaderMapping(
  headers: string[],
  entityKey: string
): Map<number, string> {
  const aliases = ENTITY_ALIASES[entityKey] || {};
  const columnIndexToField = new Map<number, string>();
  const mappedFields = new Set<string>();

  const normalizedHeaders = headers.map(normalizeHeader);

  // Phase 1: Exact matches
  normalizedHeaders.forEach((normH, idx) => {
    if (!normH) return;
    for (const [targetKey, aliasList] of Object.entries(aliases)) {
      if (mappedFields.has(targetKey)) continue;
      if (aliasList.some((alias) => normH === alias)) {
        columnIndexToField.set(idx, targetKey);
        mappedFields.add(targetKey);
        break;
      }
    }
  });

  // Phase 2: Prefix / Containment for remaining unmapped columns
  // Only match if the alias is specific (length >= 4) to avoid false collisions from short aliases like 'gst', 'code', 'name', 'unit'
  normalizedHeaders.forEach((normH, idx) => {
    if (columnIndexToField.has(idx) || !normH) return;

    let bestMatchKey: string | null = null;
    let longestMatchLen = 0;

    for (const [targetKey, aliasList] of Object.entries(aliases)) {
      if (mappedFields.has(targetKey)) continue;
      for (const alias of aliasList) {
        if (alias.length >= 4 && (normH.startsWith(alias) || alias.startsWith(normH))) {
          if (alias.length > longestMatchLen) {
            longestMatchLen = alias.length;
            bestMatchKey = targetKey;
          }
        }
      }
    }

    if (bestMatchKey) {
      columnIndexToField.set(idx, bestMatchKey);
      mappedFields.add(bestMatchKey);
    }
  });

  return columnIndexToField;
}

/**
 * Maps raw CSV row cells to normalized schema keys using pre-resolved column mapping
 */
export function mapRowToSchema(
  headerKeys: string[],
  cells: string[],
  columnMapping: Map<number, string>
): { rawData: Record<string, string>; mappedData: Record<string, any> } {
  const rawData: Record<string, string> = {};
  const mappedData: Record<string, any> = {};

  headerKeys.forEach((header, idx) => {
    const rawValue = cells[idx] || '';
    rawData[header] = rawValue;

    const targetKey = columnMapping.get(idx);
    if (targetKey && mappedData[targetKey] === undefined) {
      mappedData[targetKey] = rawValue;
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
  const columnMapping = resolveHeaderMapping(rawHeaders, entityKey);

  dataRows.forEach((cells, index) => {
    // Skip completely empty rows
    if (cells.every((c) => !c.trim())) return;

    const { rawData, mappedData } = mapRowToSchema(rawHeaders, cells, columnMapping);
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
    const knownTreatments = new Set([
      'REGISTERED BUSINESS - REGULAR',
      'REGISTERED BUSINESS - COMPOSITION',
      'UNREGISTERED BUSINESS',
      'CONSUMER',
      'OVERSEAS',
      'SPECIAL ECONOMIC ZONE',
      'BUSINESS_GST',
      'BUSINESS_REGISTERED',
      'CONSUMER_GST',
      'OVERSEAS_GST'
    ]);
    const placeholders = new Set([
      'NA',
      'N/A',
      'NONE',
      'NIL',
      'NULL',
      '-',
      '--',
      'NOT APPLICABLE',
      'UNREGISTERED'
    ]);

    // Sanitize common field values that may include label prefixes (e.g. "Phone: 123")
    payload = parsedRows.filter((r) => r.isValid).map((r) => {
      const m = { ...r.mappedData };
      if (typeof m.phone === 'string') {
        m.phone = m.phone.replace(/^phone\s*:\s*/i, '').replace(/^mobile\s*:\s*/i, '').trim();
      }
      if (typeof m.email === 'string') {
        m.email = m.email.replace(/^email\s*:\s*/i, '').trim();
      }
      if (typeof m.gstNumber === 'string') {
        const trimmedGst = m.gstNumber.trim();
        const upperGst = trimmedGst.toUpperCase();
        if (knownTreatments.has(upperGst)) {
          if (!m.gstTreatment) {
            m.gstTreatment = trimmedGst;
          }
          m.gstNumber = '';
        } else if (placeholders.has(upperGst)) {
          m.gstNumber = '';
        }
      }
      return m;
    });
  } else if (entityKey === 'vendors') {
    const placeholders = new Set([
      'NA',
      'N/A',
      'NONE',
      'NIL',
      'NULL',
      '-',
      '--',
      'NOT APPLICABLE',
      'UNREGISTERED'
    ]);
    payload = parsedRows.filter((r) => r.isValid).map((r) => {
      const m = { ...r.mappedData };
      if (typeof m.phone === 'string') {
        m.phone = m.phone.replace(/^phone\s*:\s*/i, '').replace(/^mobile\s*:\s*/i, '').trim();
      }
      if (typeof m.email === 'string') {
        m.email = m.email.replace(/^email\s*:\s*/i, '').trim();
      }
      if (typeof m.gstNumber === 'string') {
        const trimmedGst = m.gstNumber.trim();
        const upperGst = trimmedGst.toUpperCase();
        if (placeholders.has(upperGst)) {
          m.gstNumber = '';
        }
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

