import React, { useMemo } from "react";
import { formatCurrency, formatDate } from "@accountiva/shared";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export interface TemplateSettings {
  showLogo: boolean;
  showOrgName: boolean;
  showOrgAddress: boolean;
  showGSTIN: boolean;
  showInvoiceNumber: boolean;
  showDate: boolean;
  showDueDate: boolean;
  showClientCompany: boolean;
  showClientAddress: boolean;
  showItemDescription: boolean;
  showQuantity: boolean;
  showRate: boolean;
  showTax: boolean;
  showSubtotal: boolean;
  showFooter: boolean;
}

export const defaultTemplateSettings: TemplateSettings = {
  showLogo: true,
  showOrgName: true,
  showOrgAddress: true,
  showGSTIN: true,
  showInvoiceNumber: true,
  showDate: true,
  showDueDate: true,
  showClientCompany: true,
  showClientAddress: true,
  showItemDescription: true,
  showQuantity: true,
  showRate: true,
  showTax: true,
  showSubtotal: true,
  showFooter: true,
};

export type TemplateId = "standard" | "modern" | "minimal" | "premium";

export interface InvoiceTemplateProps {
  invoice: any;
  organization?: any;
  templateId?: TemplateId;
  settings?: TemplateSettings;
  showWatermark?: boolean;
}

export function InvoiceTemplate({
  invoice,
  organization,
  templateId = "standard",
  settings = defaultTemplateSettings,
  showWatermark,
}: InvoiceTemplateProps) {
  const { currentOrganization } = useAuth();
  const org = organization || currentOrganization || {};

  const shouldShowWatermark = useMemo(() => {
    if (typeof showWatermark === "boolean") return showWatermark;
    return String(org.plan || "").toLowerCase() !== "pro";
  }, [showWatermark, org.plan]);

  const documentLogoUrl = org.large_logo_url || org.logo_url || org.small_logo_url;

  const invoiceItems = useMemo(() => {
    if (Array.isArray(invoice?.items) && invoice.items.length > 0) {
      return invoice.items;
    }
    return [
      {
        id: "1",
        name: invoice?.description || "Services Rendered",
        description: "Professional accounting consultancy and development",
        quantity: 1,
        rate: Number(invoice?.amount) || 0,
        amount: Number(invoice?.amount) || 0,
      },
    ];
  }, [invoice]);

  const subtotal = useMemo(() => {
    if (invoice?.subtotal !== undefined && invoice?.subtotal !== null && Number(invoice.subtotal) > 0) {
      return Number(invoice.subtotal);
    }
    return invoiceItems.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0);
  }, [invoice, invoiceItems]);

  const tax = useMemo(() => {
    const rawTax = Number(invoice?.taxAmount ?? invoice?.tax_amount);
    if (!isNaN(rawTax) && rawTax > 0) return rawTax;
    if (invoice?.taxPercent && Number(invoice.taxPercent) > 0) {
      return (subtotal * Number(invoice.taxPercent)) / 100;
    }
    return 0;
  }, [invoice, subtotal]);

  const discount = useMemo(() => {
    const rawDisc = Number(invoice?.discountAmount);
    if (!isNaN(rawDisc) && rawDisc > 0) return rawDisc;
    if (invoice?.discountType === "percentage" && invoice?.discountValue) {
      return (subtotal * Number(invoice.discountValue)) / 100;
    }
    if (invoice?.discountType === "fixed" && invoice?.discountValue) {
      return Number(invoice.discountValue);
    }
    return 0;
  }, [invoice, subtotal]);

  const total = useMemo(() => {
    if (invoice?.amount !== undefined && invoice?.amount !== null && Number(invoice.amount) > 0) {
      return Number(invoice.amount);
    }
    return subtotal + tax - discount;
  }, [invoice, subtotal, tax, discount]);

  const printableCustomFields = useMemo(() => {
    if (!invoice?.customFields) return [];
    if (Array.isArray(invoice.customFields)) {
      return invoice.customFields.filter(
        (f: any) =>
          f.printOnDocument !== false &&
          f.value !== null &&
          f.value !== undefined &&
          f.value !== ""
      );
    }
    return [];
  }, [invoice]);

  const customerName =
    invoice?.customers?.name ||
    invoice?.customerName ||
    invoice?.customer?.name ||
    "Valued Client";

  const customerAddress =
    invoice?.customers?.address ||
    invoice?.customerAddress ||
    invoice?.customer?.address ||
    "";

  const customerCompany =
    invoice?.customers?.company ||
    invoice?.customerCompany ||
    invoice?.customer?.company ||
    "";

  return (
    <div className={cn("w-full max-w-[800px] mx-auto select-text print:max-w-none print:m-0", `template-${templateId}`)}>
      {/* 1. Standard Template */}
      {templateId === "standard" && (
        <div className="p-8 bg-white text-slate-800 font-sans shadow-xs rounded-xl border border-slate-100 print:shadow-none print:border-none">
          <div className="flex justify-between items-start mb-10">
            <div>
              {documentLogoUrl && settings.showLogo && (
                <img
                  src={documentLogoUrl}
                  alt="Logo"
                  className="h-12 mb-3 object-contain"
                />
              )}
              {settings.showOrgName && (
                <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">
                  {org.name || "Accountiva"}
                </h1>
              )}
              {settings.showOrgAddress && org.address && (
                <p className="text-xs text-slate-500 whitespace-pre-line max-w-[260px] leading-relaxed mt-1">
                  {org.address}
                </p>
              )}
              {settings.showGSTIN && org.gstin && (
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase font-mono">
                  GSTIN: {org.gstin}
                </p>
              )}
            </div>

            <div className="text-right">
              <h2 className="text-4xl font-light text-slate-300 uppercase tracking-widest mb-3">
                Invoice
              </h2>
              {settings.showInvoiceNumber && (
                <p className="text-sm font-bold text-slate-800 font-mono">
                  #{invoice.invoiceNumber || invoice.number}
                </p>
              )}
              {settings.showDate && invoice.date && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Date: {formatDate(invoice.date)}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-10 border-y border-slate-100 py-6">
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Bill To:
              </h3>
              <p className="text-sm font-bold text-slate-800">{customerName}</p>
              {settings.showClientCompany && customerCompany && (
                <p className="text-xs text-slate-600 mt-0.5">{customerCompany}</p>
              )}
              {settings.showClientAddress && customerAddress && (
                <p className="text-xs text-slate-500 whitespace-pre-line mt-1 leading-relaxed">
                  {customerAddress}
                </p>
              )}
            </div>

            <div className="text-right">
              {settings.showDueDate && invoice.dueDate && (
                <>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Due Date:
                  </h3>
                  <p className="text-sm font-bold text-slate-800">
                    {formatDate(invoice.dueDate)}
                  </p>
                </>
              )}

              <div className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border uppercase tracking-wider bg-slate-50 text-slate-700 border-slate-200">
                Status: {invoice.status || "Draft"}
              </div>

              {printableCustomFields.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                  {printableCustomFields.map((cf: any) => (
                    <div key={cf.name} className="text-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1.5">
                        {cf.name}:
                      </span>
                      <span className="font-bold text-slate-700">
                        {typeof cf.value === "boolean" ? (cf.value ? "Yes" : "No") : String(cf.value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <table className="w-full mb-10 text-left">
            <thead>
              <tr className="border-b-2 border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-3 text-left">Description</th>
                {settings.showQuantity && <th className="py-3 text-right w-16">Qty</th>}
                {settings.showRate && <th className="py-3 text-right w-28 pr-4">Rate</th>}
                <th className="py-3 text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoiceItems.map((item: any, idx: number) => (
                <tr key={item.id || idx}>
                  <td className="py-3.5">
                    <p className="text-sm font-bold text-slate-800">
                      {item.name || item.itemName}
                    </p>
                    {settings.showItemDescription && item.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                    )}
                  </td>
                  {settings.showQuantity && (
                    <td className="py-3.5 text-right text-sm text-slate-600 font-mono">
                      {item.quantity}
                    </td>
                  )}
                  {settings.showRate && (
                    <td className="py-3.5 text-right text-sm text-slate-600 pr-4 font-mono">
                      {formatCurrency(item.rate)}
                    </td>
                  )}
                  <td className="py-3.5 text-right text-sm font-bold text-slate-800 font-mono">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-xs">
              {settings.showSubtotal && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Subtotal</span>
                  <span className="text-slate-700 font-bold font-mono">{formatCurrency(subtotal)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Discount</span>
                  <span className="text-slate-700 font-bold font-mono">- {formatCurrency(discount)}</span>
                </div>
              )}
              {settings.showTax && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Tax</span>
                  <span className="text-slate-700 font-bold font-mono">{formatCurrency(tax)}</span>
                </div>
              )}
              <div className="h-px bg-slate-100 my-1.5" />
              <div className="flex justify-between items-center text-sm pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Amount</span>
                <span className="text-xl font-black text-slate-900 font-mono">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {settings.showFooter && (
            <div className="mt-16 pt-6 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-medium italic">
                Thank you for your business. Please make payment by the due date.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 2. Modern Template */}
      {templateId === "modern" && (
        <div className="bg-white min-h-[600px] shadow-sm rounded-2xl overflow-hidden font-sans border border-slate-100 print:border-none print:shadow-none">
          <div className="bg-slate-950 p-8 sm:p-10 text-white flex justify-between items-end">
            <div>
              {(settings.showLogo || settings.showOrgName) && (
                <div className="bg-white/10 p-3.5 rounded-xl backdrop-blur-md inline-block mb-5 border border-white/15">
                  {documentLogoUrl && settings.showLogo ? (
                    <img src={documentLogoUrl} alt="Logo" className="h-9 filter invert brightness-0" />
                  ) : (
                    <span className="text-lg font-black tracking-tight">{org.name || "Accountiva"}</span>
                  )}
                </div>
              )}
              <h1 className="text-4xl font-black uppercase tracking-tight opacity-20 mb-1 leading-none">
                Invoice
              </h1>
              <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest opacity-60">
                {settings.showInvoiceNumber && <span>#{invoice.invoiceNumber || invoice.number}</span>}
                {settings.showDate && invoice.date && <span>Issued: {formatDate(invoice.date)}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl sm:text-4xl font-black mb-1 font-mono">{formatCurrency(total)}</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-40">Total Due</div>
            </div>
          </div>

          <div className="p-8 sm:p-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="sm:col-span-2">
              <div className="bg-slate-50 p-6 rounded-2xl h-full border border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Recipient</h3>
                <p className="text-base font-bold text-slate-900">{customerName}</p>
                {settings.showClientAddress && customerAddress && (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed whitespace-pre-line">{customerAddress}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-between py-1 space-y-3">
              {settings.showDueDate && invoice.dueDate && (
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Due Date</h3>
                  <p className="text-xs font-bold text-slate-900">{formatDate(invoice.dueDate)}</p>
                </div>
              )}
              {settings.showOrgAddress && org.address && (
                <div className="pt-3 border-t border-slate-100">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Company</h3>
                  <p className="text-xs font-bold text-slate-700">{org.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{org.address}</p>
                </div>
              )}
            </div>
          </div>

          <div className="px-8 sm:px-10 mb-8">
            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-3.5 px-5">Item Description</th>
                    {settings.showQuantity && <th className="py-3.5 px-4 text-center">Qty</th>}
                    {settings.showRate && <th className="py-3.5 px-4 text-right">Price</th>}
                    <th className="py-3.5 px-5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceItems.map((item: any, idx: number) => (
                    <tr key={item.id || idx} className="text-xs hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-5">
                        <p className="font-bold text-slate-800">{item.name || item.itemName}</p>
                        {settings.showItemDescription && item.description && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{item.description}</p>
                        )}
                      </td>
                      {settings.showQuantity && (
                        <td className="py-4 px-4 text-center text-slate-600 font-medium font-mono">{item.quantity}</td>
                      )}
                      {settings.showRate && (
                        <td className="py-4 px-4 text-right text-slate-600 font-mono">{formatCurrency(item.rate)}</td>
                      )}
                      <td className="py-4 px-5 text-right font-bold text-slate-900 font-mono">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-8 sm:p-10 bg-slate-50 flex justify-between items-center border-t border-slate-100">
            {settings.showFooter && (
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic max-w-xs">
                Please remit payment within the specified timeframe.
              </div>
            )}
            <div className="text-right space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grand Total</div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{formatCurrency(total)}</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Minimal Template */}
      {templateId === "minimal" && (
        <div className="p-10 bg-white text-gray-900 font-mono text-xs max-w-2xl mx-auto shadow-xs border border-gray-100 print:border-none print:shadow-none">
          <div className="border-b border-gray-100 pb-6 mb-6 flex justify-between items-start">
            <div>
              {settings.showOrgName && <h1 className="text-base font-bold">{org.name || "Accountiva"}</h1>}
              {settings.showOrgAddress && org.address && (
                <p className="mt-1 opacity-60 text-[11px] max-w-[200px] leading-relaxed">{org.address}</p>
              )}
            </div>
            <div className="text-right">
              {settings.showInvoiceNumber && <p className="font-bold">INVOICE #{invoice.invoiceNumber || invoice.number}</p>}
              {settings.showDate && invoice.date && <p className="mt-1 opacity-60">{formatDate(invoice.date)}</p>}
            </div>
          </div>

          <div className="mb-8 flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase mb-1 opacity-40">Client</p>
              <p className="font-bold">{customerName}</p>
              {settings.showClientAddress && customerAddress && (
                <p className="mt-1 opacity-60 text-[11px] leading-relaxed">{customerAddress}</p>
              )}
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <div className="border-b border-gray-100 pb-2 text-[10px] font-bold uppercase opacity-40 flex justify-between">
              <span>Description</span>
              <div className="flex gap-8">
                {settings.showQuantity && <span className="w-12 text-right">Qty</span>}
                <span className="w-20 text-right">Total</span>
              </div>
            </div>
            {invoiceItems.map((item: any, idx: number) => (
              <div key={item.id || idx} className="flex justify-between items-start text-[11px]">
                <div className="flex-1 pr-6">
                  <p className="font-bold">{item.name || item.itemName}</p>
                  {settings.showItemDescription && item.description && (
                    <p className="mt-0.5 opacity-50 text-[10px] leading-relaxed">{item.description}</p>
                  )}
                </div>
                <div className="flex gap-8">
                  {settings.showQuantity && <span className="w-12 text-right opacity-60">{item.quantity}</span>}
                  <span className="w-20 text-right font-bold">{formatCurrency(item.amount)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-6 flex justify-end">
            <div className="w-44 space-y-1.5 text-[11px]">
              {settings.showSubtotal && (
                <div className="flex justify-between opacity-60">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
              )}
              {settings.showTax && (
                <div className="flex justify-between opacity-60">
                  <span>Tax</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Premium Template */}
      {templateId === "premium" && (
        <div className="bg-slate-50 p-1 rounded-xl shadow-md overflow-hidden border border-slate-200 print:border-none print:shadow-none print:p-0">
          <div className="bg-white border-[10px] border-slate-900 p-8 sm:p-10 min-h-[650px] flex flex-col font-serif">
            <div className="flex justify-between items-start mb-12">
              <div>
                {documentLogoUrl && settings.showLogo ? (
                  <img src={documentLogoUrl} alt="Logo" className="h-14 mb-4 object-contain" />
                ) : (
                  settings.showOrgName && (
                    <h1 className="text-2xl font-black italic tracking-tight text-slate-900 mb-2">
                      {org.name || "Accountiva"}
                    </h1>
                  )
                )}
                {settings.showOrgAddress && org.address && (
                  <div className="text-xs italic text-slate-500 max-w-xs leading-relaxed">{org.address}</div>
                )}
              </div>
              <div className="text-right">
                <h2 className="text-5xl font-black text-slate-100 uppercase mb-2 leading-none select-none">
                  Invoice
                </h2>
                <div className="space-y-0.5 text-xs text-slate-600 font-sans">
                  {settings.showInvoiceNumber && (
                    <p className="font-bold text-slate-900 font-mono">Ref: {invoice.invoiceNumber || invoice.number}</p>
                  )}
                  {settings.showDate && invoice.date && <p>Date: {formatDate(invoice.date)}</p>}
                  {settings.showDueDate && invoice.dueDate && <p>Due: {formatDate(invoice.dueDate)}</p>}
                </div>
              </div>
            </div>

            <div className="mb-10 border-l-4 border-slate-900 pl-6">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-2 font-sans">
                Prepared For
              </h3>
              <p className="text-xl font-bold text-slate-900">{customerName}</p>
              {settings.showClientCompany && customerCompany && (
                <p className="text-xs text-slate-600 mt-1 font-sans">{customerCompany}</p>
              )}
              {settings.showClientAddress && customerAddress && (
                <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed whitespace-pre-line font-sans">
                  {customerAddress}
                </p>
              )}
            </div>

            <div className="flex-1 mb-8">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-900/15 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] font-sans">
                    <th className="py-3">Description</th>
                    {settings.showRate && <th className="py-3 text-right">Price</th>}
                    <th className="py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceItems.map((item: any, idx: number) => (
                    <tr key={item.id || idx}>
                      <td className="py-4">
                        <p className="text-base font-bold text-slate-800">{item.name || item.itemName}</p>
                        {settings.showItemDescription && item.description && (
                          <p className="text-xs italic text-slate-400 mt-0.5">{item.description}</p>
                        )}
                      </td>
                      {settings.showRate && (
                        <td className="py-4 text-right text-xs text-slate-600 font-sans">
                          {formatCurrency(item.rate)} {settings.showQuantity && `x ${item.quantity}`}
                        </td>
                      )}
                      <td className="py-4 text-right text-base font-bold text-slate-900 font-sans font-mono">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex justify-between items-end border-t-2 border-slate-900 pt-6">
              <div className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em] font-sans hidden sm:block">
                Accountiva Premium
              </div>
              <div className="w-full sm:w-64 space-y-2 text-xs font-sans">
                {settings.showSubtotal && (
                  <div className="flex justify-between text-slate-500 italic">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatCurrency(subtotal)}</span>
                  </div>
                )}
                {settings.showTax && (
                  <div className="flex justify-between text-slate-500 italic">
                    <span>Tax</span>
                    <span className="font-mono">{formatCurrency(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grand Total</span>
                  <span className="text-2xl font-black text-slate-900 font-mono">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Free Tier Watermark */}
      {shouldShowWatermark && (
        <div className="mt-8 pt-3 text-center text-xs text-slate-400 font-medium select-none flex items-center justify-center gap-1.5 print:hidden">
          <span>Powered by</span>
          <span className="font-bold tracking-tight text-slate-700">Accountiva</span>
        </div>
      )}
    </div>
  );
}

