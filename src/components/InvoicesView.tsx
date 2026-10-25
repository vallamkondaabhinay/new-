import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Eye,
  DollarSign,
  Calendar,
  Printer,
  Receipt,
  CheckCircle,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Invoice, SalonSettings } from '../types/salon.ts';

interface InvoicesViewProps {
  salon: SalonSettings | null;
  onViewInvoice: (invoiceId: string) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({ salon, onViewInvoice }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'pending'>('all');
  const [loading, setLoading] = useState(true);

  const currencySymbol = salon?.currency === 'INR' ? '₹' : (salon?.currency || '₹');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await api.getInvoices({
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setInvoices(data);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const filteredInvoices = invoices.filter((inv) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(s) ||
      (inv.customer_name && inv.customer_name.toLowerCase().includes(s)) ||
      (inv.customer_phone && inv.customer_phone.includes(s))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-luxury text-3xl font-bold text-[#2E0A28]">
            Invoices & Payment Registry
          </h2>
          <p className="text-xs text-[#6F5B6A] mt-0.5">
            Audit-safe invoice archive with tax records, balance settlements and luxury print views.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DEC8] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#8C7A87] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by invoice number, customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#D8CCC4] text-xs focus:ring-2 focus:ring-[#C59A45] outline-none"
          />
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          {(['all', 'paid', 'partial', 'pending'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === s
                  ? 'bg-[#2E0A28] text-[#FAF8F5]'
                  : 'bg-[#FAF8F5] text-[#6F5B6A] hover:bg-[#EAE2D5]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-2xl border border-[#E8DEC8] shadow-xs overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-[#8C7A87]">
            <Receipt className="w-12 h-12 mx-auto mb-3 text-[#D8CCC4]" />
            <p className="text-sm font-semibold text-[#4A3845]">No invoices found</p>
            <p className="text-xs mt-1">Generated POS transactions will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#6F5B6A] uppercase tracking-wider font-semibold border-b border-[#E8DEC8]">
                <tr>
                  <th className="px-6 py-3.5">Invoice #</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5">Payment Method</th>
                  <th className="px-6 py-3.5 text-right">Subtotal</th>
                  <th className="px-6 py-3.5 text-right">Grand Total</th>
                  <th className="px-6 py-3.5 text-right">Balance Due</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DEC8]">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                    <td className="px-6 py-3.5 font-bold font-mono text-[#2E0A28]">
                      {inv.invoice_number}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-[#4A3845]">
                      <p>{inv.customer_name || 'Walk-in'}</p>
                      <span className="text-[10px] text-[#8C7A87] font-mono">{inv.customer_phone}</span>
                    </td>
                    <td className="px-6 py-3.5 text-[#6F5B6A]">
                      {new Date(inv.created_at).toLocaleDateString()} {new Date(inv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-3.5 capitalize text-[#6F5B6A]">{inv.payment_method}</td>
                    <td className="px-6 py-3.5 text-right text-[#6F5B6A]">
                      {currencySymbol}{inv.subtotal.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-[#2E0A28]">
                      {currencySymbol}{inv.total_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-rose-700">
                      {inv.balance_due > 0 ? `${currencySymbol}${inv.balance_due.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => onViewInvoice(inv.id)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#D8CCC4] text-[#2E0A28] hover:bg-[#EAE2D5] font-semibold text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View / Print</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
