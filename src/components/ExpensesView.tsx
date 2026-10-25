import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Search, Trash2, Calendar, TrendingDown, X } from 'lucide-react';
import { api } from '../services/api.ts';
import { Expense, SalonSettings } from '../types/salon.ts';

interface ExpensesViewProps {
  salon: SalonSettings | null;
}

const EXPENSE_CATEGORIES = [
  'Rent & Lease',
  'Electricity & Utilities',
  'Staff Salaries',
  'Product & Salon Supplies',
  'Equipment & Tools',
  'Repairs & Maintenance',
  'Marketing & Advertising',
  'Internet & Software',
  'Other Expenses',
];

export const ExpensesView: React.FC<ExpensesViewProps> = ({ salon }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Rent & Lease');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formMethod, setFormMethod] = useState('bank_transfer');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencySymbol = salon?.currency === 'INR' ? '₹' : (salon?.currency || '₹');

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const data = await api.getExpenses();
      setExpenses(data);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formTitle || !formAmount || Number(formAmount) <= 0) {
      setFormError('Please enter a valid title and positive amount.');
      return;
    }
    setIsSubmitting(true);

    try {
      await api.createExpense({
        title: formTitle,
        category: formCategory,
        amount: Number(formAmount),
        payment_method: formMethod,
        date: formDate,
        notes: formNotes,
      });
      setShowModal(false);
      setFormTitle('');
      setFormAmount('');
      setFormNotes('');
      fetchExpenses();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string, title: string) => {
    if (!window.confirm(`Delete expense record "${title}"?`)) return;
    try {
      await api.deleteExpense(id);
      fetchExpenses();
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense');
    }
  };

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-luxury text-3xl font-bold text-[#2E0A28]">
            Business Expenses
          </h2>
          <p className="text-xs text-[#6F5B6A] mt-0.5">
            Log overhead, rent, utility bills, salaries and supplies to calculate genuine net profit.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C59A45] to-[#DFB76C] text-[#2E0A28] font-bold text-xs shadow-xs hover:brightness-105 active:scale-95 transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-[#2E0A28]" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-white p-5 rounded-2xl border border-[#E8DEC8] shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] flex items-center justify-center text-[#2E0A28]">
            <TrendingDown className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <p className="text-xs text-[#6F5B6A] font-semibold uppercase tracking-wider">
              Total Recorded Expenses
            </p>
            <p className="text-2xl font-bold text-[#2E0A28]">
              {currencySymbol}{totalExpenseAmount.toLocaleString()}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-[#8C7A87]">
          {expenses.length} Entries
        </span>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-[#E8DEC8] shadow-xs overflow-hidden">
        {expenses.length === 0 ? (
          <div className="p-12 text-center text-[#8C7A87]">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-[#D8CCC4]" />
            <p className="text-sm font-semibold text-[#4A3845]">No expenses recorded</p>
            <p className="text-xs mt-1">Record operating expenditures to accurately track salon profitability.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#6F5B6A] uppercase tracking-wider font-semibold border-b border-[#E8DEC8]">
                <tr>
                  <th className="px-6 py-3.5">Expense Title</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Payment Method</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DEC8]">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-[#2E0A28]">
                      <p>{exp.title}</p>
                      {exp.notes && <p className="text-[10px] text-[#8C7A87] font-normal">{exp.notes}</p>}
                    </td>
                    <td className="px-6 py-3.5 text-[#4A3845]">{exp.category}</td>
                    <td className="px-6 py-3.5 text-[#6F5B6A]">{exp.date}</td>
                    <td className="px-6 py-3.5 capitalize text-[#6F5B6A]">{exp.payment_method}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-rose-700">
                      {currencySymbol}{exp.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleDeleteExpense(exp.id, exp.title)}
                        className="p-1.5 text-[#8C7A87] hover:text-rose-700 rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-[#E8DEC8] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DEC8] pb-3">
              <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">
                Record Business Expense
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#8C7A87] hover:text-[#2E0A28]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Expense Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October Salon Rent, Electricity Bill"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none"
                />
              </div>

              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Category *</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] bg-white"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Amount *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Payment Method</label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] bg-white"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
                />
              </div>

              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Notes / Invoice Ref</label>
                <input
                  type="text"
                  placeholder="Optional reference"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8CCC4] text-[#4A3845] hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#2E0A28] text-[#FAF8F5] font-semibold hover:bg-[#3E1137] disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
