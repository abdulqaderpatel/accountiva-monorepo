export interface EntityTemplateConfig {
  entity: string;
  displayName: string;
  fileName: string;
  headers: string[];
  sampleRows: string[][];
  requiredColumns: string[];
  instructions: string[];
}

export const ENTITY_TEMPLATES: Record<string, EntityTemplateConfig> = {
  customers: {
    entity: 'customers',
    displayName: 'Customers',
    fileName: 'accountiva_customers_template.csv',
    headers: [
      'Customer Name',
      'Customer Code',
      'Email',
      'Phone',
      'Company Name',
      'Billing Address',
      'Shipping Address',
      'GST Number',
      'GST Treatment',
      'Payment Terms',
      'Opening Balance',
      'Notes'
    ],
    sampleRows: [
      [
        'Acme Corporation',
        'CUST-0001',
        'billing@acme.corp',
        '+91 9876543210',
        'Acme Corp Pvt Ltd',
        '101 Business Hub, MG Road, Bengaluru, KA 560001',
        'Warehouse 4, Peenya Industrial Area, Bengaluru, KA 560058',
        '29AABCU9603R1ZM',
        'Registered Business - Regular',
        'Net 30',
        '0',
        'Preferred Enterprise client'
      ],
      [
        'Global Tech Solutions',
        'CUST-0002',
        'accounts@globaltech.io',
        '+91 9123456780',
        'Global Tech Solutions LLP',
        'Tower B, Cyber City, Gurugram, HR 122002',
        'Tower B, Cyber City, Gurugram, HR 122002',
        '06AABCG1234F1ZX',
        'Registered Business - Regular',
        'Due on Receipt',
        '5000',
        'Quarterly software maintenance'
      ]
    ],
    requiredColumns: ['Customer Name'],
    instructions: [
      'Customer Name is required.',
      'GST Treatment should be one of: Registered Business - Regular, Registered Business - Composition, Unregistered Business, Consumer, Overseas, Special Economic Zone.',
      'Leave Customer Code blank to auto-generate sequentially.'
    ]
  },

  vendors: {
    entity: 'vendors',
    displayName: 'Vendors',
    fileName: 'accountiva_vendors_template.csv',
    headers: [
      'Vendor Name',
      'Vendor Code',
      'Email',
      'Phone',
      'Company Name',
      'Address',
      'GST Number',
      'GST Treatment',
      'Payment Terms',
      'Bank Name',
      'Bank Account Number',
      'Bank IFSC',
      'Opening Balance',
      'Notes'
    ],
    sampleRows: [
      [
        'Cloud Hosting Providers',
        'VEND-0001',
        'billing@cloudprovider.com',
        '+91 9988776655',
        'Cloud Solutions India Ltd',
        'Level 4, IT Park, Whitefield, Bengaluru, KA 560066',
        '29AABCC4321K1ZW',
        'Registered Business - Regular',
        'Net 15',
        'HDFC Bank',
        '50200012345678',
        'HDFC0001234',
        '0',
        'Primary cloud infrastructure provider'
      ],
      [
        'Office Supplies Direct',
        'VEND-0002',
        'sales@officesupplies.in',
        '+91 9811223344',
        'Office Mart Retailers',
        'Shop 12, Market Complex, Pune, MH 411001',
        '',
        'Unregistered Business',
        'Due on Receipt',
        'State Bank of India',
        '30214569874',
        'SBIN0004562',
        '1200',
        'Stationery and office pantry supply'
      ]
    ],
    requiredColumns: ['Vendor Name'],
    instructions: [
      'Vendor Name is required.',
      'GST Number and Bank details are optional.',
      'Leave Vendor Code blank to auto-generate sequentially.'
    ]
  },

  items: {
    entity: 'items',
    displayName: 'Products & Services',
    fileName: 'accountiva_items_template.csv',
    headers: [
      'Item Name',
      'SKU',
      'Type',
      'Classification',
      'Category',
      'Unit of Measurement',
      'Selling Price',
      'Cost Price',
      'Opening Stock',
      'Reorder Point',
      'Sales Tax Rate',
      'Purchase Tax Rate',
      'HSN or SAC Code',
      'Tax Preference',
      'Description'
    ],
    sampleRows: [
      [
        'Web Application Development (Hour)',
        'SRV-WEB-01',
        'Service',
        '',
        'Professional Services',
        'Hours',
        '2500',
        '1200',
        '0',
        '0',
        '18',
        '18',
        '998314',
        'Taxable',
        'Custom web design and full-stack development service'
      ],
      [
        'Ergonomic Mesh Office Chair',
        'PRD-CHR-01',
        'Product',
        'Inventory',
        'Office Furniture',
        'Pcs',
        '8500',
        '5200',
        '50',
        '10',
        '18',
        '18',
        '940130',
        'Taxable',
        'High-back ergonomic mesh chair with adjustable lumbar support'
      ]
    ],
    requiredColumns: ['Item Name', 'Selling Price'],
    instructions: [
      'Item Name and Selling Price are required.',
      'Type must be "Product" or "Service". Default is "Product".',
      'Classification can be "Inventory" or "Non-Inventory" (default for Product is "Inventory").',
      'Opening Stock is the initial stock on hand (e.g. 50).',
      'Reorder Point triggers a low stock alert when stock falls to or below this level.',
      'Selling Price and Cost Price should be numeric numbers (no currency symbols).',
      'Sales Tax Rate and Purchase Tax Rate should be percentages (e.g. 18 or 0).'
    ]
  },

  invoices: {
    entity: 'invoices',
    displayName: 'Invoices',
    fileName: 'accountiva_invoices_template.csv',
    headers: [
      'Invoice Number',
      'Customer Name',
      'Customer Email',
      'Invoice Date',
      'Due Date',
      'Item Name',
      'Quantity',
      'Rate',
      'Item Description',
      'Reference Number',
      'Discount %',
      'Tax %',
      'Notes'
    ],
    sampleRows: [
      [
        'INV-2026-001',
        'Acme Corporation',
        'billing@acme.corp',
        '2026-09-01',
        '2026-10-01',
        'Web Application Development (Hour)',
        '40',
        '2500',
        'Sprint 1 development deliverables',
        'PO-9842',
        '5',
        '18',
        'Thank you for your business!'
      ],
      [
        'INV-2026-001',
        'Acme Corporation',
        'billing@acme.corp',
        '2026-09-01',
        '2026-10-01',
        'Cloud Infrastructure Setup',
        '1',
        '15000',
        'AWS VPC and staging cluster deployment',
        'PO-9842',
        '5',
        '18',
        'Thank you for your business!'
      ],
      [
        'INV-2026-002',
        'Global Tech Solutions',
        'accounts@globaltech.io',
        '2026-09-05',
        '2026-09-20',
        'Ergonomic Mesh Office Chair',
        '4',
        '8500',
        'Office seating batch 2',
        'REF-4421',
        '0',
        '18',
        'Delivered with warranty card'
      ]
    ],
    requiredColumns: ['Invoice Number', 'Customer Name', 'Invoice Date', 'Item Name', 'Quantity', 'Rate'],
    instructions: [
      'Multiple rows with the same "Invoice Number" will be grouped into a single multi-line invoice!',
      'Customer Name, Item Name, Quantity, and Rate are required.',
      'Dates should be in YYYY-MM-DD format (e.g. 2026-09-01).',
      'If Customer or Item does not exist, they will be automatically created.'
    ]
  },

  bills: {
    entity: 'bills',
    displayName: 'Bills',
    fileName: 'accountiva_bills_template.csv',
    headers: [
      'Bill Number',
      'Vendor Name',
      'Vendor Email',
      'Bill Date',
      'Due Date',
      'Item Name',
      'Quantity',
      'Rate',
      'Item Description',
      'Reference Number',
      'Tax %',
      'Notes'
    ],
    sampleRows: [
      [
        'BILL-2026-001',
        'Cloud Hosting Providers',
        'billing@cloudprovider.com',
        '2026-09-02',
        '2026-09-17',
        'Cloud Dedicated Server Instance',
        '1',
        '12500',
        'September production servers',
        'VEND-INV-889',
        '18',
        'Paid via net banking'
      ],
      [
        'BILL-2026-002',
        'Office Supplies Direct',
        'sales@officesupplies.in',
        '2026-09-10',
        '2026-09-25',
        'Printer Paper Rim A4',
        '10',
        '350',
        '75 GSM White Copier Paper',
        'ORD-1092',
        '18',
        'Delivered to Reception'
      ]
    ],
    requiredColumns: ['Bill Number', 'Vendor Name', 'Bill Date', 'Item Name', 'Quantity', 'Rate'],
    instructions: [
      'Multiple rows with the same "Bill Number" will be grouped into a single multi-line bill!',
      'Vendor Name, Item Name, Quantity, and Rate are required.',
      'Dates should be in YYYY-MM-DD format (e.g. 2026-09-02).'
    ]
  },

  expenses: {
    entity: 'expenses',
    displayName: 'Expenses',
    fileName: 'accountiva_expenses_template.csv',
    headers: [
      'Date',
      'Expense Account',
      'Amount',
      'Paid Through',
      'Vendor Name',
      'Reference Number',
      'Notes'
    ],
    sampleRows: [
      [
        '2026-09-04',
        'Office Supplies',
        '4500',
        'Bank Account / Main Operating Account',
        'Office Supplies Direct',
        'TXN-99812',
        'Pantry coffee and tea supplies'
      ],
      [
        '2026-09-08',
        'Software & Subscriptions',
        '8999',
        'Corporate Credit Card',
        'Figma Design',
        'SUB-FIG-99',
        'Monthly team license'
      ]
    ],
    requiredColumns: ['Date', 'Expense Account', 'Amount', 'Paid Through'],
    instructions: [
      'Date, Expense Account, Amount, and Paid Through are required.',
      'Amount must be a positive number.',
      'Date should be in YYYY-MM-DD format.'
    ]
  }
};

/**
 * Escapes a cell value for standard RFC 4180 CSV
 */
function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Builds standard CSV string from headers and rows
 */
export function generateCsvContent(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Triggers a browser download for the template CSV
 */
export function downloadSampleCsv(entityKey: string): void {
  const config = ENTITY_TEMPLATES[entityKey];
  if (!config) {
    console.error(`No template configured for entity: ${entityKey}`);
    return;
  }

  const csvContent = generateCsvContent(config.headers, config.sampleRows);
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', config.fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

