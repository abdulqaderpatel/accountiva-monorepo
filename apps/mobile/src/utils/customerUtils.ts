export function formatAddress(addr: any): string {
  if (!addr) return '';
  if (typeof addr === 'string') {
    const trimmed = addr.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          return formatAddress(parsed);
        }
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  if (typeof addr === 'object' && addr !== null) {
    const extractStr = (val: any) =>
      typeof val === 'string' ? val.trim() : typeof val === 'number' ? String(val) : '';
    const parts = [
      extractStr(addr.street || addr.address || addr.addressLine1 || addr.address_line1 || addr.line1),
      extractStr(addr.addressLine2 || addr.address_line2 || addr.line2),
      extractStr(addr.city),
      extractStr(addr.state),
      extractStr(addr.postalCode || addr.postal_code || addr.zip || addr.zipCode),
      extractStr(addr.country),
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '';
  }
  return typeof addr === 'number' ? String(addr) : '';
}

export function extractCustomerId(item: any): string {
  if (!item || typeof item !== 'object') return '';
  return String(
    item.customerId ||
    item.customer_id ||
    (typeof item.customer === 'object' && item.customer ? item.customer.id : '') ||
    (typeof item.customers === 'object' && item.customers ? item.customers.id : '') ||
    ''
  );
}

export function matchesCustomer(item: any, customerId: string, customerName: string): boolean {
  if (!item || typeof item !== 'object') return false;

  const targetName = (customerName || '').toLowerCase().trim();
  const targetId = (customerId || '').trim();

  const itemCustName = (
    typeof item.customer === 'string'
      ? item.customer
      : typeof item.customer?.name === 'string'
      ? item.customer.name
      : typeof item.customerName === 'string'
      ? item.customerName
      : typeof item.customers?.name === 'string'
      ? item.customers.name
      : ''
  ).toLowerCase().trim();

  const itemCustId = extractCustomerId(item);

  return (
    (Boolean(targetId) && itemCustId === targetId) ||
    (Boolean(targetName) && Boolean(itemCustName) && itemCustName.includes(targetName))
  );
}

