import React, { useState } from 'react';
import { X, Printer, CheckCircle, AlertCircle, Sparkles, DollarSign } from 'lucide-react';
import { Invoice, SalonSettings } from '../types/salon.ts';
import { api } from '../services/api.ts';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  salon: SalonSettings | null;
  onClose: () => void;
  onPaymentSettled?: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  salon,
  onClose,
  onPaymentSettled,
}) => {
  if (!invoice) return null;

  const [settleAmount, setSettleAmount] = useState<number>(invoice.balance_due || 0);
  const [settleMethod, setSettleMethod] = useState<string>('cash');
  const [settleNotes, setSettleNotes] = useState<string>('');
  const [isSettling, setIsSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  const currencySymbol = salon?.currency === 'INR' ? '₹' : (salon?.currency || '₹');

  const handlePrint = () => {
    window.print();
  };

  const handleSettleBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settleAmount <= 0) return;
    setIsSettling(true);
    setSettleError(null);

    try {
      await api.addPaymentToInvoice(invoice.id, {
        amount: Number(settleAmount),
        method: settleMethod,
        notes: settleNotes,
      });
      if (onPaymentSettled) onPaymentSettled();
      onClose();
    } catch (err: any) {
      setSettleError(err.message || 'Payment settlement failed');
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-[#E8DEC8] overflow-hidden my-8">
        {/* Modal Controls (Hidden in print) */}
        <div className="no-print bg-[#FAF8F5] px-6 py-3.5 border-b border-[#E8DEC8] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-xs text-[#2E0A28] uppercase tracking-wider">
              Official Tax Invoice
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                invoice.status === 'paid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : invoice.status === 'partial'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {invoice.status}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-[#2E0A28] text-[#FAF8F5] text-xs font-semibold hover:bg-[#3E1137] flex items-center space-x-1.5 transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-[#DFB76C]" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#EAE2D5] text-[#6F5B6A] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="p-8 space-y-6 text-[#2E0A28]" id="printable-invoice">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-[#E8DEC8] pb-6">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Sparkles className="w-5 h-5 text-[#C59A45]" />
                <h2 className="font-serif-luxury text-2xl font-bold text-[#2E0A28]">
                  {salon?.business_name || 'Gild & Glow Salon'}
                </h2>
              </div>
              <p className="text-xs text-[#6F5B6A] max-w-sm">{salon?.tagline}</p>
              <p className="text-xs text-[#6F5B6A] mt-1">{salon?.address}</p>
              <p className="text-xs text-[#6F5B6A]">
                {salon?.phone && `Phone: ${salon.phone}`} {salon?.email && `| Email: ${salon.email}`}
              </p>
            </div>

            <div className="text-right">
              <p className="font-serif-luxury text-xl font-bold text-[#2E0A28]">INVOICE</p>
              <p className="text-xs font-mono font-bold text-[#8C6826] mt-0.5">{invoice.invoice_number}</p>
              <p className="text-xs text-[#6F5B6A] mt-1">
                Date: {new Date(invoice.created_at).toLocaleDateString()}
              </p>
              <p className="text-xs text-[#6F5B6A]">
                Time: {new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E8DEC8] flex justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8C7A87] block">Billed To</span>
              <p className="font-bold text-sm text-[#2E0A28] mt-0.5">{invoice.customer_name || 'Walk-in Guest'}</p>
              <p className="text-[#6F5B6A]">{invoice.customer_phone}</p>
              {invoice.customer_email && <p className="text-[#6F5B6A]">{invoice.customer_email}</p>}
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-[#8C7A87] block">Payment Tender</span>
              <p className="font-semibold capitalize text-[#2E0A28] mt-0.5">{invoice.payment_method}</p>
              <p className="text-[#6F5B6A]">
                Status: <span className="font-bold uppercase">{invoice.status}</span>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#2E0A28] text-[#2E0A28] uppercase text-[11px] font-bold">
                <tr>
                  <th className="py-2.5">Item / Treatment</th>
                  <th className="py-2.5 text-center">Type</th>
                  <th className="py-2.5 text-center">Qty</th>
                  <th className="py-2.5 text-right">Unit Price</th>
                  <th className="py-2.5 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DEC8]">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-3 font-medium text-[#2E0A28]">
                        {it.item_name}
                      </td>
                      <td className="py-3 text-center capitalize text-[#6F5B6A]">
                        {it.item_type}
                      </td>
                      <td className="py-3 text-center">{it.quantity}</td>
                      <td className="py-3 text-right">
                        {currencySymbol}{it.unit_price.toLocaleString()}
                      </td>
                      <td className="py-3 text-right font-semibold">
                        {currencySymbol}{it.line_total.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-[#8C7A87]">
                      No items recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-[#6F5B6A]">
                <span>Subtotal:</span>
                <span className="font-medium text-[#2E0A28]">{currencySymbol}{invoice.subtotal.toLocaleString()}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount ({invoice.discount_type === 'percentage' ? `${invoice.discount_val}%` : 'Flat'}):</span>
                  <span>- {currencySymbol}{invoice.discount_amount.toLocaleString()}</span>
                </div>
              )}
              {invoice.tax_amount > 0 && (
                <div className="flex justify-between text-[#6F5B6A]">
                  <span>Tax / GST ({invoice.tax_rate}%):</span>
                  <span className="font-medium text-[#2E0A28]">{currencySymbol}{invoice.tax_amount.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-[#2E0A28] pt-2 flex justify-between text-sm font-bold text-[#2E0A28]">
                <span>Grand Total:</span>
                <span className="text-[#8C6826]">{currencySymbol}{invoice.total_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>Amount Paid:</span>
                <span className="font-semibold">{currencySymbol}{invoice.paid_amount.toLocaleString()}</span>
              </div>
              {invoice.balance_due > 0 ? (
                <div className="flex justify-between text-rose-700 font-bold border-t border-rose-200 pt-1">
                  <span>Balance Due:</span>
                  <span>{currencySymbol}{invoice.balance_due.toLocaleString()}</span>
                </div>
              ) : (
                <div className="flex items-center justify-end space-x-1 text-emerald-700 font-semibold pt-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Fully Settled</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer note */}
          <div className="border-t border-[#E8DEC8] pt-4 text-center text-[10px] text-[#8C7A87]">
            <p>Thank you for choosing {salon?.business_name || 'Gild & Glow'}! We look forward to pampering you again soon.</p>
            <p className="mt-0.5">Computer generated tax invoice. Valid without physical signature.</p>
          </div>
        </div>

        {/* Settle Remaining Balance Drawer (No Print) */}
        {invoice.balance_due > 0 && (
          <div className="no-print bg-[#FAF8F5] p-6 border-t border-[#E8DEC8]">
            <p className="text-xs font-bold text-[#2E0A28] mb-2 flex items-center space-x-1.5">
              <DollarSign className="w-4 h-4 text-[#8C6826]" />
              <span>Record Balance Settlement</span>
            </p>
            {settleError && (
              <p className="text-xs text-rose-700 mb-2">{settleError}</p>
            )}
            <form onSubmit={handleSettleBalance} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[#6F5B6A] mb-1 font-medium">Settle Amount</label>
                <input
                  type="number"
                  max={invoice.balance_due}
                  step="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-[#D8CCC4] bg-white font-bold"
                />
              </div>
              <div>
                <label className="block text-[#6F5B6A] mb-1 font-medium">Method</label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D8CCC4] bg-white"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-[#6F5B6A] mb-1 font-medium">Notes / Ref</label>
                <input
                  type="text"
                  placeholder="Optional reference"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D8CCC4] bg-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSettling || settleAmount <= 0}
                  className="w-full py-2 rounded-lg bg-emerald-800 text-white font-bold hover:bg-emerald-900 transition-colors disabled:opacity-50"
                >
                  {isSettling ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
