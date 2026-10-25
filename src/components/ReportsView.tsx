import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Printer,
  Download,
  TrendingUp,
  DollarSign,
  Receipt,
  PieChart,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { SalonSettings } from '../types/salon.ts';

interface ReportsViewProps {
  salon: SalonSettings | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ salon }) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const currencySymbol = salon?.currency === 'INR' ? '₹' : (salon?.currency || '₹');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await api.getReports(startDate || undefined, endDate || undefined);
      setReportData(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  const summary = reportData?.summary || {
    gross_sales: 0,
    total_discounts: 0,
    total_tax: 0,
    net_sales: 0,
    payments_received: 0,
    outstanding_balances: 0,
    totalExpenses: 0,
    estimatedProfit: 0,
    invoice_count: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-luxury text-3xl font-bold text-[#2E0A28]">
            Financial & Business Analytics
          </h2>
          <p className="text-xs text-[#6F5B6A] mt-0.5">
            Strict accounting reports calculated from genuine invoices and expense entries.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto no-print">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-[#2E0A28] text-[#FAF8F5] font-semibold text-xs flex items-center space-x-1.5 hover:bg-[#3E1137]"
          >
            <Printer className="w-3.5 h-3.5 text-[#DFB76C]" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="no-print bg-white p-4 rounded-2xl border border-[#E8DEC8] shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold text-[#2E0A28] flex items-center space-x-1.5">
          <Calendar className="w-4 h-4 text-[#8C6826]" />
          <span>Date Filter:</span>
        </span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-[#D8CCC4]"
          placeholder="Start Date"
        />
        <span className="text-[#8C7A87]">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-[#D8CCC4]"
          placeholder="End Date"
        />
        {(startDate || endDate) && (
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="text-xs text-[#8C6826] hover:underline font-medium"
          >
            Clear Filter (All Time)
          </button>
        )}
      </div>

      {/* Financial Statement P&L Summary */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8DEC8] shadow-xs space-y-4">
        <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">
          Profit & Loss Summary Statement
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Revenue Calculation */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] space-y-2">
            <span className="font-bold text-xs uppercase tracking-wider text-[#8C7A87] block">
              1. Revenue Breakdown
            </span>
            <div className="flex justify-between text-[#6F5B6A]">
              <span>Gross Sales (Itemized Subtotals):</span>
              <span className="font-semibold text-[#2E0A28]">{currencySymbol}{summary.gross_sales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Less: Total Discounts Authorized:</span>
              <span>- {currencySymbol}{summary.total_discounts.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[#6F5B6A]">
              <span>Plus: Tax / GST Collected:</span>
              <span>+ {currencySymbol}{summary.total_tax.toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t border-[#D8CCC4] flex justify-between font-bold text-sm text-[#2E0A28]">
              <span>Net Sales (Total Invoiced):</span>
              <span className="text-[#8C6826]">{currencySymbol}{summary.net_sales.toLocaleString()}</span>
            </div>
          </div>

          {/* Profit & Cashflow Calculation */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] space-y-2">
            <span className="font-bold text-xs uppercase tracking-wider text-[#8C7A87] block">
              2. Cashflow & Net Earnings
            </span>
            <div className="flex justify-between text-emerald-800">
              <span>Actual Payments Received:</span>
              <span className="font-semibold">{currencySymbol}{summary.payments_received.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-rose-700">
              <span>Outstanding Balances Due:</span>
              <span className="font-semibold">{currencySymbol}{summary.outstanding_balances.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-rose-700">
              <span>Less: Total Recorded Operating Expenses:</span>
              <span>- {currencySymbol}{summary.totalExpenses.toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t border-[#D8CCC4] flex justify-between font-bold text-sm text-[#2E0A28]">
              <span>Estimated Net Business Profit:</span>
              <span className={summary.estimatedProfit >= 0 ? 'text-[#2E0A28]' : 'text-rose-700'}>
                {currencySymbol}{summary.estimatedProfit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown by Payment Tender and Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tender Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8DEC8] shadow-xs space-y-3">
          <h4 className="font-serif-luxury text-lg font-bold text-[#2E0A28]">
            Collections by Payment Method
          </h4>
          {reportData?.paymentMethods && reportData.paymentMethods.length > 0 ? (
            <div className="space-y-2 text-xs">
              {reportData.paymentMethods.map((pm: any) => (
                <div
                  key={pm.payment_method}
                  className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] flex items-center justify-between"
                >
                  <span className="capitalize font-semibold text-[#2E0A28]">
                    {pm.payment_method.replace('_', ' ')} ({pm.count} bills)
                  </span>
                  <span className="font-bold text-emerald-800">
                    {currencySymbol}{pm.total.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8C7A87]">No payment records in selected period.</p>
          )}
        </div>

        {/* Expenses by Category */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8DEC8] shadow-xs space-y-3">
          <h4 className="font-serif-luxury text-lg font-bold text-[#2E0A28]">
            Operating Expenses by Category
          </h4>
          {reportData?.expensesByCategory && reportData.expensesByCategory.length > 0 ? (
            <div className="space-y-2 text-xs">
              {reportData.expensesByCategory.map((exp: any) => (
                <div
                  key={exp.category}
                  className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] flex items-center justify-between"
                >
                  <span className="font-medium text-[#2E0A28]">
                    {exp.category} ({exp.count} entries)
                  </span>
                  <span className="font-bold text-rose-700">
                    {currencySymbol}{exp.total.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8C7A87]">No operating expenses recorded for period.</p>
          )}
        </div>
      </div>
    </div>
  );
};
