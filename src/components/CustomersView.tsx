import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  Clock,
  Receipt,
  Eye,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Customer, SalonSettings } from '../types/salon.ts';

interface CustomersViewProps {
  salon: SalonSettings | null;
  onViewInvoice: (invoiceId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ salon, onViewInvoice }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Active Customer Profile Drawer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formBirthday, setFormBirthday] = useState('');
  const [formGender, setFormGender] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formAllergies, setFormAllergies] = useState('');
  const [formMarketingConsent, setFormMarketingConsent] = useState(true);
  const [formWhatsappConsent, setFormWhatsappConsent] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencySymbol = salon?.currency === 'INR' ? '₹' : (salon?.currency || '₹');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.getCustomers(search);
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const openCustomerProfile = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setLoadingDetails(true);
    try {
      const details = await api.getCustomer(customer.id);
      setCustomerDetails(details);
    } catch (err) {
      console.error('Failed to load customer profile details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormBirthday('');
    setFormGender('');
    setFormNotes('');
    setFormAllergies('');
    setFormMarketingConsent(true);
    setFormWhatsappConsent(true);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormName(cust.name);
    setFormPhone(cust.phone);
    setFormEmail(cust.email || '');
    setFormBirthday(cust.birthday || '');
    setFormGender(cust.gender || '');
    setFormNotes(cust.notes || '');
    setFormAllergies(cust.allergies || '');
    setFormMarketingConsent(cust.marketing_consent === 1);
    setFormWhatsappConsent(cust.whatsapp_consent === 1);
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, {
          name: formName,
          phone: formPhone,
          email: formEmail || null,
          birthday: formBirthday || null,
          gender: formGender || null,
          notes: formNotes || null,
          allergies: formAllergies || null,
          marketing_consent: formMarketingConsent ? 1 : 0,
          whatsapp_consent: formWhatsappConsent ? 1 : 0,
        });
      } else {
        await api.createCustomer({
          name: formName,
          phone: formPhone,
          email: formEmail || null,
          birthday: formBirthday || null,
          gender: formGender || null,
          notes: formNotes || null,
          allergies: formAllergies || null,
          marketing_consent: formMarketingConsent ? 1 : 0,
          whatsapp_consent: formWhatsappConsent ? 1 : 0,
        });
      }
      setShowModal(false);
      fetchCustomers();
      if (selectedCustomer && editingCustomer && selectedCustomer.id === editingCustomer.id) {
        openCustomerProfile({ ...selectedCustomer, name: formName, phone: formPhone });
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete customer "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteCustomer(id);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-luxury text-3xl font-bold text-[#2E0A28]">
            Customer Directory
          </h2>
          <p className="text-xs text-[#6F5B6A] mt-0.5">
            Registered customer database with duplicate prevention, treatment notes & visit logs.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C59A45] to-[#DFB76C] text-[#2E0A28] font-bold text-xs shadow-xs hover:brightness-105 active:scale-95 transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 text-[#2E0A28]" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DEC8] shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8C7A87] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by customer name or phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#D8CCC4] text-xs focus:ring-2 focus:ring-[#C59A45] outline-none"
          />
        </div>
        <span className="text-xs font-semibold text-[#6F5B6A] shrink-0">
          {customers.length} {customers.length === 1 ? 'Customer' : 'Customers'}
        </span>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-2xl border border-[#E8DEC8] shadow-xs overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-12 text-center text-[#8C7A87]">
            <Users className="w-12 h-12 mx-auto mb-3 text-[#D8CCC4]" />
            <p className="text-sm font-semibold text-[#4A3845]">No customers found</p>
            <p className="text-xs mt-1">
              Start building your salon client base by clicking &quot;Add New Customer&quot;.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#6F5B6A] uppercase tracking-wider font-semibold border-b border-[#E8DEC8]">
                <tr>
                  <th className="px-6 py-3.5">Customer Name</th>
                  <th className="px-6 py-3.5">Phone (Normalized)</th>
                  <th className="px-6 py-3.5">Visits</th>
                  <th className="px-6 py-3.5">Total Spent</th>
                  <th className="px-6 py-3.5">Last Visit</th>
                  <th className="px-6 py-3.5">Precautions / Notes</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DEC8]">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-[#FAF8F5]/80 transition-colors cursor-pointer"
                    onClick={() => openCustomerProfile(c)}
                  >
                    <td className="px-6 py-3.5 font-bold text-[#2E0A28] flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-[#E8DEC8] text-[#2E0A28] flex items-center justify-center font-bold text-[11px]">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{c.name}</span>
                    </td>
                    <td className="px-6 py-3.5 text-[#4A3845] font-mono">{c.phone}</td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-[#FAF8F5] border border-[#E8DEC8] font-bold text-[#2E0A28]">
                        {c.visit_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-bold text-[#8C6826]">
                      {currencySymbol}{(c.total_spent || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-[#6F5B6A]">
                      {c.last_visit_date
                        ? new Date(c.last_visit_date).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-3.5">
                      {c.allergies ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px] inline-flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>{c.allergies}</span>
                        </span>
                      ) : (
                        <span className="text-[#8C7A87]">None</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openCustomerProfile(c)}
                        className="p-1.5 rounded-lg text-[#6F5B6A] hover:bg-[#EAE2D5] hover:text-[#2E0A28]"
                        title="View Full Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1.5 rounded-lg text-[#6F5B6A] hover:bg-[#EAE2D5] hover:text-[#2E0A28]"
                        title="Edit Customer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CUSTOMER PROFILE DRAWER */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-[#E8DEC8] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-[#FAF8F5] p-6 border-b border-[#E8DEC8] flex items-center justify-between">
              <div>
                <h3 className="font-serif-luxury text-2xl font-bold text-[#2E0A28]">
                  {selectedCustomer.name}
                </h3>
                <p className="text-xs text-[#6F5B6A] font-mono mt-0.5">{selectedCustomer.phone}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openEditModal(selectedCustomer)}
                  className="px-3 py-1.5 rounded-lg border border-[#D8CCC4] bg-white text-xs font-semibold hover:bg-[#FAF8F5] text-[#2E0A28]"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 rounded-lg text-[#8C7A87] hover:text-[#2E0A28]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Profile Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DEC8] text-center">
                  <p className="text-lg font-bold text-[#2E0A28]">{selectedCustomer.visit_count || 0}</p>
                  <p className="text-[10px] text-[#8C7A87] uppercase font-semibold">Total Visits</p>
                </div>
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DEC8] text-center">
                  <p className="text-lg font-bold text-[#8C6826]">
                    {currencySymbol}{(selectedCustomer.total_spent || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-[#8C7A87] uppercase font-semibold">Total Spent</p>
                </div>
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DEC8] text-center">
                  <p className="text-lg font-bold text-[#2E0A28]">
                    {selectedCustomer.loyalty_points || 0}
                  </p>
                  <p className="text-[10px] text-[#8C7A87] uppercase font-semibold">Loyalty Pts</p>
                </div>
              </div>

              {/* Allergies / Precautions */}
              {selectedCustomer.allergies && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Safety Precautions & Allergies:</span>
                  </div>
                  <p className="text-xs text-rose-900">{selectedCustomer.allergies}</p>
                </div>
              )}

              {/* Next Revisit Calculation */}
              {customerDetails?.nextRevisit && (
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#2E0A28] flex items-center space-x-1.5">
                      <Clock className="w-4 h-4 text-[#C59A45]" />
                      <span>Next Revisit Recommendation</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        customerDetails.nextRevisit.status === 'overdue'
                          ? 'bg-rose-100 text-rose-800'
                          : customerDetails.nextRevisit.status === 'due_today'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {customerDetails.nextRevisit.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[#6F5B6A]">
                    Recommended based on {customerDetails.nextRevisit.serviceName} ({customerDetails.nextRevisit.intervalDays} days interval).
                  </p>
                  <p className="text-[#2E0A28] font-bold">
                    Suggested Date: {customerDetails.nextRevisit.targetDate}
                  </p>
                </div>
              )}

              {/* Visit History Invoices */}
              <div className="space-y-3">
                <h4 className="font-serif-luxury text-base font-bold text-[#2E0A28]">
                  Invoice & Service History
                </h4>

                {customerDetails?.invoices && customerDetails.invoices.length > 0 ? (
                  <div className="space-y-2">
                    {customerDetails.invoices.map((inv: any) => (
                      <div
                        key={inv.id}
                        className="p-3 rounded-xl border border-[#E8DEC8] bg-white hover:bg-[#FAF8F5] transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-[#2E0A28]">{inv.invoice_number}</p>
                          <p className="text-[11px] text-[#6F5B6A]">
                            {new Date(inv.created_at).toLocaleDateString()} &bull; {inv.items?.length || 0} items
                          </p>
                        </div>
                        <div className="text-right flex items-center space-x-2">
                          <div>
                            <p className="font-bold text-[#8C6826]">
                              {currencySymbol}{inv.total_amount.toLocaleString()}
                            </p>
                            <span
                              className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </div>
                          <button
                            onClick={() => onViewInvoice(inv.id)}
                            className="p-1 rounded bg-[#FAF8F5] border border-[#D8CCC4] text-[#2E0A28]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8C7A87]">No invoice history recorded yet.</p>
                )}
              </div>

              {/* Preferences & Notes */}
              {selectedCustomer.notes && (
                <div className="space-y-1">
                  <h4 className="font-serif-luxury text-base font-bold text-[#2E0A28]">
                    Customer Preferences & Notes
                  </h4>
                  <p className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] text-[#4A3845]">
                    {selectedCustomer.notes}
                  </p>
                </div>
              )}

              {/* Danger Zone */}
              <div className="pt-6 border-t border-[#E8DEC8]">
                <button
                  onClick={() => handleDeleteCustomer(selectedCustomer.id, selectedCustomer.name)}
                  className="w-full py-2 rounded-xl text-rose-700 hover:bg-rose-50 border border-rose-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Delete Customer Record</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT CUSTOMER MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-[#E8DEC8] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DEC8] pb-3">
              <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
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

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya Sharma"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none"
                />
              </div>

              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="+91 9876543210"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="customer@email.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Birthday (Optional)</label>
                  <input
                    type="date"
                    value={formBirthday}
                    onChange={(e) => setFormBirthday(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">
                  Allergies / Chemical Sensitivity / Cautions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ammonia sensitivity, sensitive scalp, retinol irritation"
                  value={formAllergies}
                  onChange={(e) => setFormAllergies(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none"
                />
              </div>

              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Preferences & Styling Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Prefers cold wash, layered bob style, medium pressure massage"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none"
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formWhatsappConsent}
                    onChange={(e) => setFormWhatsappConsent(e.target.checked)}
                    className="rounded text-[#2E0A28] focus:ring-[#C59A45]"
                  />
                  <span className="text-[#4A3845]">Customer consents to WhatsApp service revisit reminders</span>
                </label>
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
                  disabled={isSubmitting || !formName || !formPhone}
                  className="px-5 py-2 rounded-xl bg-[#2E0A28] text-[#FAF8F5] font-semibold hover:bg-[#3E1137] disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
