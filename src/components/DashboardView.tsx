import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  Users,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Sparkles,
  ShoppingBag,
  DollarSign,
  Plus,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { DashboardMetrics, Product, Invoice, SalonSettings } from '../types/salon.ts';

interface DashboardViewProps {
  salon: SalonSettings | null;
  onNavigate: (tab: string) => void;
  onOpenPOS: () => void;
  onOpenAppointment: () => void;
  onViewInvoice: (invoiceId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  salon,
  onNavigate,
  onOpenPOS,
  onOpenAppointment,
  onViewInvoice,
}) => {
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const currencySymbol = salon?.currency === 'INR' ? '₹' : (salon?.currency || '₹');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboard(range);
      setMetrics(data.metrics);
      setLowStockProducts(data.lowStockProducts || []);
      setRecentInvoices(data.recentInvoices || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [range]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-luxury text-3xl font-bold text-[#2E0A28]">
            Salon Business Overview
          </h2>
          <p className="text-xs text-[#6F5B6A] mt-0.5">
            Real-time financial analytics and operational metrics from genuine salon records.
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="inline-flex p-1 bg-[#EAE2D5] rounded-xl text-xs font-medium self-start sm:self-auto">
          {(['today', 'week', 'month', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                range === r
                  ? 'bg-[#2E0A28] text-[#FAF8F5] font-semibold shadow-xs'
                  : 'text-[#6F5B6A] hover:text-[#2E0A28]'
              }`}
            >
              {r === 'all' ? 'All Time' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Low-Stock Warning Banner if any */}
      {lowStockProducts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                Low Stock Alert ({lowStockProducts.length} {lowStockProducts.length === 1 ? 'item' : 'items'})
              </p>
              <p className="text-[11px] text-amber-700">
                {lowStockProducts.slice(0, 3).map((p) => `${p.name} (${p.current_stock} left)`).join(', ')}
                {lowStockProducts.length > 3 ? ` and ${lowStockProducts.length - 3} more` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('inventory')}
            className="px-3 py-1.5 rounded-lg bg-amber-200 text-amber-900 text-xs font-semibold hover:bg-amber-300 transition-colors"
          >
            Manage Stock
          </button>
        </div>
      )}

      {/* Retention Alert Banner if revisits are overdue or due today */}
      {metrics && (metrics.overdueRevisits > 0 || metrics.dueTodayRevisits > 0) && (
        <div className="p-4 rounded-2xl bg-[#3D1035]/5 border border-[#3D1035]/15 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#2E0A28] flex items-center justify-center text-[#DFB76C]">
              <Clock className="w-5 h-5 text-[#DFB76C]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#2E0A28]">
                Customer Retention Radar: {metrics.overdueRevisits + metrics.dueTodayRevisits} visits awaiting recall
              </p>
              <p className="text-[11px] text-[#6F5B6A]">
                {metrics.dueTodayRevisits} due today, {metrics.overdueRevisits} overdue for their service interval.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('retention')}
            className="px-3.5 py-1.5 rounded-lg bg-[#2E0A28] text-[#FAF8F5] text-xs font-semibold hover:bg-[#3E1137] transition-colors"
          >
            Open Retention Suite
          </button>
        </div>
      )}

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DEC8] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#6F5B6A] uppercase tracking-wider">
              {range === 'today' ? "Today's Sales" : `${range.toUpperCase()} Sales`}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E8DEC8] flex items-center justify-center text-[#C59A45]">
              <Receipt className="w-4 h-4 text-[#8C6826]" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-[#2E0A28]">
              {currencySymbol}{metrics?.totalSales.toLocaleString() || '0'}
            </span>
          </div>
          <p className="text-[11px] text-[#8C7A87] mt-1">
            Today: {currencySymbol}{metrics?.todaySales.toLocaleString() || '0'} | Month: {currencySymbol}{metrics?.monthSales.toLocaleString() || '0'}
          </p>
        </div>

        {/* Payments Received & Outstanding */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DEC8] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#6F5B6A] uppercase tracking-wider">
              Cash / Received
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E8DEC8] flex items-center justify-center text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-emerald-800">
              {currencySymbol}{metrics?.paymentsReceived.toLocaleString() || '0'}
            </span>
          </div>
          <p className="text-[11px] text-rose-600 mt-1">
            Outstanding Due: {currencySymbol}{metrics?.outstandingBalance.toLocaleString() || '0'}
          </p>
        </div>

        {/* Expenses & Estimated Profit */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DEC8] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#6F5B6A] uppercase tracking-wider">
              Est. Net Profit
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E8DEC8] flex items-center justify-center text-[#2E0A28]">
              <TrendingUp className="w-4 h-4 text-[#DFB76C]" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className={`text-2xl font-bold ${(metrics?.netProfitEstimate || 0) >= 0 ? 'text-[#2E0A28]' : 'text-rose-700'}`}>
              {currencySymbol}{metrics?.netProfitEstimate.toLocaleString() || '0'}
            </span>
          </div>
          <p className="text-[11px] text-[#8C7A87] mt-1">
            Recorded Expenses: {currencySymbol}{metrics?.recordedExpenses.toLocaleString() || '0'}
          </p>
        </div>

        {/* Appointments Summary */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DEC8] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#6F5B6A] uppercase tracking-wider">
              Appointments
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E8DEC8] flex items-center justify-center text-[#8C6826]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-[#2E0A28]">
              {metrics?.todayAppointments || 0}
            </span>
            <span className="text-xs text-[#6F5B6A]">today</span>
          </div>
          <p className="text-[11px] text-[#8C7A87] mt-1">
            Upcoming: {metrics?.upcomingAppointments || 0} | Done: {metrics?.completedAppointments || 0}
          </p>
        </div>
      </div>

      {/* Customer Retention & Catalogue Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Base & Retention Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8DEC8] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">
              Customer Retention
            </h3>
            <button
              onClick={() => onNavigate('customers')}
              className="text-xs font-semibold text-[#8C6826] hover:underline flex items-center"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center py-2">
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DEC8]">
              <p className="text-lg font-bold text-[#2E0A28]">{metrics?.totalCustomers || 0}</p>
              <p className="text-[10px] uppercase tracking-wider text-[#6F5B6A]">Total</p>
            </div>
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DEC8]">
              <p className="text-lg font-bold text-emerald-800">{metrics?.newCustomersThisMonth || 0}</p>
              <p className="text-[10px] uppercase tracking-wider text-[#6F5B6A]">New MTD</p>
            </div>
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DEC8]">
              <p className="text-lg font-bold text-[#C59A45]">{metrics?.returningCustomers || 0}</p>
              <p className="text-[10px] uppercase tracking-wider text-[#6F5B6A]">Returning</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F5]">
              <span className="text-[#4A3845]">Revisits Overdue:</span>
              <span className="font-bold text-rose-700">{metrics?.overdueRevisits || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F5]">
              <span className="text-[#4A3845]">Revisits Due Today:</span>
              <span className="font-bold text-amber-700">{metrics?.dueTodayRevisits || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F5]">
              <span className="text-[#4A3845]">Revisits Due in 3 Days:</span>
              <span className="font-bold text-[#2E0A28]">{metrics?.dueSoonRevisits || 0}</span>
            </div>
          </div>
        </div>

        {/* Quick Operations Actions */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8DEC8] shadow-xs space-y-4">
          <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">
            Quick Counter Actions
          </h3>

          <div className="space-y-3">
            <button
              onClick={onOpenPOS}
              className="w-full p-3.5 rounded-xl bg-gradient-to-r from-[#C59A45] to-[#DFB76C] text-[#2E0A28] font-bold text-sm flex items-center justify-between shadow-xs hover:brightness-105 active:scale-98 transition-all"
            >
              <div className="flex items-center space-x-3">
                <Receipt className="w-5 h-5" />
                <div className="text-left">
                  <p className="leading-tight">Express POS Bill</p>
                  <p className="text-[11px] font-normal text-[#2E0A28]/80">Walk-in billing & multi-tender checkout</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenAppointment}
              className="w-full p-3.5 rounded-xl bg-[#2E0A28] text-[#FAF8F5] font-semibold text-sm flex items-center justify-between hover:bg-[#3E1137] active:scale-98 transition-all"
            >
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-[#DFB76C]" />
                <div className="text-left">
                  <p className="leading-tight">Schedule Appointment</p>
                  <p className="text-[11px] font-normal text-[#FAF8F5]/70">Assign staff, time slot & services</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#DFB76C]" />
            </button>

            <button
              onClick={() => onNavigate('customers')}
              className="w-full p-3.5 rounded-xl border border-[#D8CCC4] bg-[#FAF8F5] text-[#2E0A28] font-semibold text-sm flex items-center justify-between hover:bg-[#F3EEEA] transition-all"
            >
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-[#8C6826]" />
                <div className="text-left">
                  <p className="leading-tight">Add New Customer</p>
                  <p className="text-[11px] font-normal text-[#6F5B6A]">Register phone with duplicate safeguard</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8C7A87]" />
            </button>
          </div>
        </div>

        {/* Catalog & Inventory Snapshot */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8DEC8] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">
              Catalogue & Supplies
            </h3>
            <button
              onClick={() => onNavigate('services')}
              className="text-xs font-semibold text-[#8C6826] hover:underline flex items-center"
            >
              <span>Manage</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8]">
              <div className="flex items-center space-x-2 text-[#8C6826] mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-semibold">Active Services</span>
              </div>
              <p className="text-2xl font-bold text-[#2E0A28]">{metrics?.totalServices || 0}</p>
              <button
                onClick={() => onNavigate('services')}
                className="text-[11px] text-[#6F5B6A] hover:underline mt-1 block"
              >
                Configure services &gt;
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8]">
              <div className="flex items-center space-x-2 text-[#8C6826] mb-1">
                <ShoppingBag className="w-4 h-4" />
                <span className="text-xs font-semibold">Retail & Stock</span>
              </div>
              <p className="text-2xl font-bold text-[#2E0A28]">{metrics?.totalProducts || 0}</p>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-[11px] text-[#6F5B6A] hover:underline mt-1 block"
              >
                Track inventory &gt;
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] text-xs">
            <div className="flex justify-between items-center text-[#6F5B6A]">
              <span>Low-stock alerts:</span>
              <span className={`font-bold ${(metrics?.lowStockCount || 0) > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {metrics?.lowStockCount || 0} items below threshold
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-2xl border border-[#E8DEC8] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8DEC8] flex items-center justify-between">
          <div>
            <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">
              Recent Invoices & Transactions
            </h3>
            <p className="text-xs text-[#6F5B6A]">Latest point-of-sale bills recorded in your database.</p>
          </div>
          <button
            onClick={() => onNavigate('invoices')}
            className="text-xs font-semibold text-[#8C6826] hover:underline flex items-center"
          >
            <span>View All Invoices</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="p-12 text-center text-[#8C7A87]">
            <Receipt className="w-12 h-12 mx-auto mb-3 text-[#D8CCC4]" />
            <p className="text-sm font-semibold text-[#4A3845]">No invoices generated yet</p>
            <p className="text-xs mt-1">
              Click &quot;New POS Bill&quot; to ring up your first service or product sale.
            </p>
            <button
              onClick={onOpenPOS}
              className="mt-4 px-4 py-2 rounded-xl bg-[#2E0A28] text-[#FAF8F5] text-xs font-semibold hover:bg-[#3E1137]"
            >
              Start Billing
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#6F5B6A] uppercase tracking-wider font-semibold border-b border-[#E8DEC8]">
                <tr>
                  <th className="px-6 py-3">Invoice #</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Date & Time</th>
                  <th className="px-6 py-3">Payment Tender</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DEC8]">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                    <td className="px-6 py-3 font-semibold text-[#2E0A28]">{inv.invoice_number}</td>
                    <td className="px-6 py-3 font-medium text-[#4A3845]">{inv.customer_name || 'Walk-in'}</td>
                    <td className="px-6 py-3 text-[#6F5B6A]">
                      {new Date(inv.created_at).toLocaleDateString()} {new Date(inv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-3 capitalize text-[#6F5B6A]">{inv.payment_method}</td>
                    <td className="px-6 py-3 text-right font-bold text-[#2E0A28]">
                      {currencySymbol}{inv.total_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
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
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => onViewInvoice(inv.id)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#D8CCC4] text-[#2E0A28] hover:bg-[#EAE2D5] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
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
