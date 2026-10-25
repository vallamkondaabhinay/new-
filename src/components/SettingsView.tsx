import React, { useState, useEffect } from 'react';
import { Settings, Save, Sparkles, Building, Scissors, Check, ShieldCheck } from 'lucide-react';
import { api } from '../services/api.ts';
import { SalonSettings } from '../types/salon.ts';

interface SettingsViewProps {
  salon: SalonSettings | null;
  onSettingsUpdated: (updated: SalonSettings) => void;
}

const BUSINESS_TYPE_OPTIONS = [
  'Hair Salon',
  'Barber Shop',
  'Unisex Salon',
  'Beauty Parlour',
  'Makeup Studio',
  'Nail Studio',
  'Spa & Wellness Centre',
  'Combined Salon & Beauty Parlour',
];

export const SettingsView: React.FC<SettingsViewProps> = ({ salon, onSettingsUpdated }) => {
  const [businessName, setBusinessName] = useState(salon?.business_name || '');
  const [tagline, setTagline] = useState(salon?.tagline || '');
  const [businessTypes, setBusinessTypes] = useState<string[]>(salon?.business_types || ['Unisex Salon']);
  const [address, setAddress] = useState(salon?.address || '');
  const [phone, setPhone] = useState(salon?.phone || '');
  const [email, setEmail] = useState(salon?.email || '');
  const [currency, setCurrency] = useState(salon?.currency || 'INR');
  const [taxRate, setTaxRate] = useState(salon?.tax_rate || 18.0);
  const [invoicePrefix, setInvoicePrefix] = useState(salon?.invoice_prefix || 'GG-');
  const [defaultDuration, setDefaultDuration] = useState(salon?.default_duration_mins || 45);
  const [openingTime, setOpeningTime] = useState(salon?.opening_time || '09:30');
  const [closingTime, setClosingTime] = useState(salon?.closing_time || '20:30');
  const [weeklyOff, setWeeklyOff] = useState(salon?.weekly_off || 'Tuesday');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (salon) {
      setBusinessName(salon.business_name || '');
      setTagline(salon.tagline || '');
      setBusinessTypes(salon.business_types || ['Unisex Salon']);
      setAddress(salon.address || '');
      setPhone(salon.phone || '');
      setEmail(salon.email || '');
      setCurrency(salon.currency || 'INR');
      setTaxRate(salon.tax_rate || 18.0);
      setInvoicePrefix(salon.invoice_prefix || 'GG-');
      setDefaultDuration(salon.default_duration_mins || 45);
      setOpeningTime(salon.opening_time || '09:30');
      setClosingTime(salon.closing_time || '20:30');
      setWeeklyOff(salon.weekly_off || 'Tuesday');
    }
  }, [salon]);

  const toggleType = (t: string) => {
    if (businessTypes.includes(t)) {
      if (businessTypes.length > 1) {
        setBusinessTypes(businessTypes.filter((item) => item !== t));
      }
    } else {
      setBusinessTypes([...businessTypes, t]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const updated = await api.updateSalonSettings({
        business_name: businessName,
        tagline,
        business_types: businessTypes,
        address,
        phone,
        email,
        currency,
        tax_rate: Number(taxRate),
        invoice_prefix: invoicePrefix,
        default_duration_mins: Number(defaultDuration),
        opening_time: openingTime,
        closing_time: closingTime,
        weekly_off: weeklyOff,
      });
      onSettingsUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-serif-luxury text-3xl font-bold text-[#2E0A28]">
          Salon Configuration & Settings
        </h2>
        <p className="text-xs text-[#6F5B6A] mt-0.5">
          Update business identity, billing tax parameters, operational hours and receipt prefixes.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-700" />
          <span>Salon configuration saved successfully!</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Identity */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8DEC8] shadow-xs space-y-4">
          <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28] border-b border-[#E8DEC8] pb-3">
            Business Profile & Categories
          </h3>

          <div>
            <label className="block text-xs font-semibold text-[#2E0A28] mb-1.5">
              Active Salon Business Types (Multi-select)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BUSINESS_TYPE_OPTIONS.map((type) => {
                const isSelected = businessTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={`p-2.5 rounded-xl text-left border text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-[#2E0A28] text-[#FAF8F5] border-[#2E0A28]'
                        : 'bg-white text-[#4A3845] border-[#D8CCC4] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <Scissors className={`w-3.5 h-3.5 ${isSelected ? 'text-[#DFB76C]' : 'text-[#8C7A87]'}`} />
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#DFB76C]" />}
                    </div>
                    <span className="line-clamp-1">{type}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#2E0A28] font-semibold mb-1">Salon / Parlour Name *</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
              />
            </div>
            <div>
              <label className="block text-[#2E0A28] font-semibold mb-1">Tagline / Motto</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block text-[#2E0A28] font-semibold mb-1">Premises Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#2E0A28] font-semibold mb-1">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
              />
            </div>
            <div>
              <label className="block text-[#2E0A28] font-semibold mb-1">Public Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
              />
            </div>
          </div>
        </div>

        {/* Financial & Invoicing Defaults */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8DEC8] shadow-xs space-y-4">
          <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28] border-b border-[#E8DEC8] pb-3">
            Invoicing & Tax Rules
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-[#2E0A28] font-semibold mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] bg-white"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
                <option value="AED">AED (د.إ)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#2E0A28] font-semibold mb-1">Standard Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
              />
            </div>

            <div>
              <label className="block text-[#2E0A28] font-semibold mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[#2E0A28] font-semibold mb-1">Default Slot (mins)</label>
              <input
                type="number"
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[#2E0A28] font-semibold mb-1">Opening Time</label>
              <input
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
              />
            </div>
            <div>
              <label className="block text-[#2E0A28] font-semibold mb-1">Closing Time</label>
              <input
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
              />
            </div>
            <div>
              <label className="block text-[#2E0A28] font-semibold mb-1">Weekly Holiday</label>
              <select
                value={weeklyOff}
                onChange={(e) => setWeeklyOff(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] bg-white"
              >
                <option value="None">None (Open 7 Days)</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-[#2E0A28] text-[#FAF8F5] text-xs font-semibold hover:bg-[#3E1137] active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-[#DFB76C]" />
            <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
