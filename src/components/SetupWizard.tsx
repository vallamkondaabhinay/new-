import React, { useState } from 'react';
import { Sparkles, Building, Scissors, ShieldCheck, Check, ArrowRight } from 'lucide-react';
import { api, setStoredToken } from '../services/api.ts';
import { signInWithGoogle } from '../services/firebaseAuth.ts';
import { Owner, SalonSettings } from '../types/salon.ts';

interface SetupWizardProps {
  onSetupSuccess: (owner: Owner, salon: SalonSettings) => void;
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

export const SetupWizard: React.FC<SetupWizardProps> = ({ onSetupSuccess }) => {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [googlePrefilling, setGooglePrefilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');

  const [businessName, setBusinessName] = useState('Gild & Glow Salon & Parlour');
  const [tagline, setTagline] = useState('Elegance & Care in Every Touch');
  const [businessTypes, setBusinessTypes] = useState<string[]>([
    'Unisex Salon',
    'Beauty Parlour',
  ]);
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [taxRate, setTaxRate] = useState(18.0);
  const [invoicePrefix, setInvoicePrefix] = useState('GG-');
  const [defaultDurationMins, setDefaultDurationMins] = useState(45);
  const [openingTime, setOpeningTime] = useState('09:30');
  const [closingTime, setClosingTime] = useState('20:30');
  const [weeklyOff, setWeeklyOff] = useState('Tuesday');
  const [prePopulateServices, setPrePopulateServices] = useState(true);

  const toggleBusinessType = (type: string) => {
    if (businessTypes.includes(type)) {
      if (businessTypes.length > 1) {
        setBusinessTypes(businessTypes.filter((t) => t !== type));
      }
    } else {
      setBusinessTypes([...businessTypes, type]);
    }
  };

  const handleGoogleAutofill = async () => {
    setError(null);
    setGooglePrefilling(true);
    try {
      const { user } = await signInWithGoogle();
      if (user.displayName) setOwnerName(user.displayName);
      if (user.email) setEmail(user.email);
      if (user.phoneNumber) setOwnerPhone(user.phoneNumber);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Could not retrieve Google profile');
      }
    } finally {
      setGooglePrefilling(false);
    }
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.setup({
        ownerName,
        email,
        password,
        phone: ownerPhone,
        businessName,
        tagline,
        businessTypes,
        address,
        currency,
        taxRate,
        invoicePrefix,
        defaultDurationMins,
        openingTime,
        closingTime,
        weeklyOff,
        prePopulateServices,
      });

      if (res.token) {
        setStoredToken(res.token);
        onSetupSuccess(res.owner, res.salon);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete initial setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-[#2E0A28] items-center justify-center text-[#DFB76C] shadow-lg border border-[#C59A45]/40 mb-3">
          <Sparkles className="w-8 h-8 text-[#DFB76C]" />
        </div>
        <h1 className="font-serif-luxury text-4xl font-bold text-[#2E0A28] tracking-tight">
          Gild & Glow
        </h1>
        <p className="text-sm text-[#6F5B6A] max-w-sm mx-auto mt-1">
          Salon & Beauty Parlour ERP Initial Setup
        </p>
      </div>

      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-[#E8DEC8] overflow-hidden">
        {/* Step Progress Bar */}
        <div className="bg-[#FAF8F5] border-b border-[#E8DEC8] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= 1 ? 'bg-[#2E0A28] text-[#DFB76C]' : 'bg-[#E8DEC8] text-[#6F5B6A]'
              }`}
            >
              1
            </span>
            <span className={`text-xs font-semibold ${step >= 1 ? 'text-[#2E0A28]' : 'text-[#8C7A87]'}`}>
              Owner Account
            </span>
          </div>

          <div className="w-12 h-0.5 bg-[#E8DEC8]" />

          <div className="flex items-center space-x-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= 2 ? 'bg-[#2E0A28] text-[#DFB76C]' : 'bg-[#E8DEC8] text-[#6F5B6A]'
              }`}
            >
              2
            </span>
            <span className={`text-xs font-semibold ${step >= 2 ? 'text-[#2E0A28]' : 'text-[#8C7A87]'}`}>
              Business Profile
            </span>
          </div>

          <div className="w-12 h-0.5 bg-[#E8DEC8]" />

          <div className="flex items-center space-x-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= 3 ? 'bg-[#2E0A28] text-[#DFB76C]' : 'bg-[#E8DEC8] text-[#6F5B6A]'
              }`}
            >
              3
            </span>
            <span className={`text-xs font-semibold ${step >= 3 ? 'text-[#2E0A28]' : 'text-[#8C7A87]'}`}>
              Catalogue & Launch
            </span>
          </div>
        </div>

        {error && (
          <div className="m-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCompleteSetup} className="p-6 sm:p-8 space-y-6">
          {/* STEP 1: OWNER CREDENTIALS */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-serif-luxury text-2xl font-bold text-[#2E0A28]">
                    Create Owner Account
                  </h3>
                  <p className="text-xs text-[#6F5B6A]">
                    This secure account will hold master administrative access to your salon ERP.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleAutofill}
                  disabled={googlePrefilling}
                  className="px-3 py-1.5 rounded-xl border border-[#D8CCC4] bg-white hover:bg-[#FAF8F5] text-[#2E0A28] text-xs font-medium shadow-sm transition-all flex items-center space-x-2 shrink-0 hover:border-[#C59A45] active:scale-95 cursor-pointer"
                  title="Autofill name and email using Google"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{googlePrefilling ? 'Connecting...' : 'Pre-fill with Google'}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Meera Singhania"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8CCC4] focus:outline-none focus:ring-2 focus:ring-[#C59A45] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                  Email Address * (Login ID)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@gildandglow.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8CCC4] focus:outline-none focus:ring-2 focus:ring-[#C59A45] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                  Password * (Min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8CCC4] focus:outline-none focus:ring-2 focus:ring-[#C59A45] text-sm"
                />
                <p className="text-[11px] text-[#8C7A87] mt-1">
                  Stored securely using industry-standard scrypt cryptographic hashing. Never stored as plain text.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8CCC4] focus:outline-none focus:ring-2 focus:ring-[#C59A45] text-sm"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  disabled={!ownerName || !email || password.length < 6}
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-[#2E0A28] text-[#FAF8F5] text-sm font-semibold hover:bg-[#3E1137] active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  <span>Continue to Business Profile</span>
                  <ArrowRight className="w-4 h-4 text-[#DFB76C]" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: BUSINESS PROFILE & CATEGORIES */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="font-serif-luxury text-2xl font-bold text-[#2E0A28]">
                  Salon & Parlour Details
                </h3>
                <p className="text-xs text-[#6F5B6A]">
                  Select all business categories that apply to customize your ERP workflows.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E0A28] mb-1.5">
                  Business Categories (Select all that apply) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BUSINESS_TYPE_OPTIONS.map((type) => {
                    const isSelected = businessTypes.includes(type);
                    return (
                      <button
                        type="button"
                        key={type}
                        onClick={() => toggleBusinessType(type)}
                        className={`p-2.5 rounded-xl text-left border text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-[#2E0A28] text-[#FAF8F5] border-[#2E0A28] shadow-xs'
                            : 'bg-white text-[#4A3845] border-[#D8CCC4] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Scissors className={`w-3.5 h-3.5 ${isSelected ? 'text-[#DFB76C]' : 'text-[#8C7A87]'}`} />
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#DFB76C]" />}
                        </div>
                        <span className="line-clamp-2 leading-tight">{type}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                    Salon / Parlour Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8CCC4] focus:outline-none focus:ring-2 focus:ring-[#C59A45] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                    Tagline / Motto
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8CCC4] focus:outline-none focus:ring-2 focus:ring-[#C59A45] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                  Full Address & City
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 14 Bloom Avenue, Jubilee Hills, Hyderabad"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8CCC4] focus:outline-none focus:ring-2 focus:ring-[#C59A45] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] text-xs bg-white"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                    Tax / GST Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                    Invoice Prefix
                  </label>
                  <input
                    type="text"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                    Default Slot (mins)
                  </label>
                  <input
                    type="number"
                    value={defaultDurationMins}
                    onChange={(e) => setDefaultDurationMins(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2E0A28] mb-1">
                    Weekly Off
                  </label>
                  <select
                    value={weeklyOff}
                    onChange={(e) => setWeeklyOff(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] text-xs bg-white"
                  >
                    <option value="None">None (Open 7 Days)</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-[#D8CCC4] text-xs font-medium text-[#4A3845] hover:bg-[#FAF8F5]"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!businessName}
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-[#2E0A28] text-[#FAF8F5] text-sm font-semibold hover:bg-[#3E1137] active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  <span>Review & Complete</span>
                  <ArrowRight className="w-4 h-4 text-[#DFB76C]" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CATALOGUE & CONFIRMATION */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="font-serif-luxury text-2xl font-bold text-[#2E0A28]">
                  Service Catalogue & Launch
                </h3>
                <p className="text-xs text-[#6F5B6A]">
                  Choose whether to include pre-configured starter services matching your business categories.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#E8DEC8] bg-[#FAF8F5] space-y-3">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prePopulateServices}
                    onChange={(e) => setPrePopulateServices(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded text-[#2E0A28] focus:ring-[#C59A45]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#2E0A28] block">
                      Include Curated Starting Services (Recommended)
                    </span>
                    <span className="text-[11px] text-[#6F5B6A] leading-relaxed block mt-0.5">
                      Adds standard professional services tailored to your categories (Haircut, Hair Spa, Hydra Glow Facial, Herbal De-Tan, Manicure/Pedicure, Beard Grooming) with customizable prices and revisit intervals. You can edit or deactivate them at any time.
                    </span>
                  </div>
                </label>
              </div>

              {/* Summary box */}
              <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E8DEC8] text-xs space-y-2">
                <p className="font-semibold text-[#2E0A28]">Setup Summary</p>
                <div className="grid grid-cols-2 gap-2 text-[#6F5B6A]">
                  <div>
                    <span className="font-medium text-[#2E0A28]">Owner:</span> {ownerName}
                  </div>
                  <div>
                    <span className="font-medium text-[#2E0A28]">Email:</span> {email}
                  </div>
                  <div>
                    <span className="font-medium text-[#2E0A28]">Salon:</span> {businessName}
                  </div>
                  <div>
                    <span className="font-medium text-[#2E0A28]">Tax Rate:</span> {taxRate}%
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-[#2E0A28]">Categories:</span> {businessTypes.join(', ')}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-[#D8CCC4] text-xs font-medium text-[#4A3845] hover:bg-[#FAF8F5]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#C59A45] to-[#DFB76C] text-[#2E0A28] font-bold text-sm shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  <ShieldCheck className="w-5 h-5 text-[#2E0A28]" />
                  <span>{loading ? 'Initializing ERP...' : 'Launch Salon ERP'}</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
