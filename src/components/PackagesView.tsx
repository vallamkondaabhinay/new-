import React, { useState, useEffect } from 'react';
import { Award, Plus, Sparkles, Check, Crown, Gift, X } from 'lucide-react';
import { api } from '../services/api.ts';
import { Package, Membership, Service, SalonSettings } from '../types/salon.ts';

interface PackagesViewProps {
  salon: SalonSettings | null;
}

export const PackagesView: React.FC<PackagesViewProps> = ({ salon }) => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [activeTab, setActiveTab] = useState<'packages' | 'memberships' | 'loyalty'>('packages');

  // New Package Modal
  const [showPkgModal, setShowPkgModal] = useState(false);
  const [pkgName, setPkgName] = useState('');
  const [pkgPrice, setPkgPrice] = useState(2500);
  const [pkgValidity, setPkgValidity] = useState(90);

  // New Membership Modal
  const [showMemModal, setShowMemModal] = useState(false);
  const [memName, setMemName] = useState('');
  const [memPrice, setMemPrice] = useState(5000);
  const [memValidity, setMemValidity] = useState(365);
  const [memDiscount, setMemDiscount] = useState(15);

  const currencySymbol = salon?.currency === 'INR' ? '₹' : (salon?.currency || '₹');

  const fetchData = async () => {
    try {
      const [pkgs, mems, srvs] = await Promise.all([
        api.getPackages(),
        api.getMemberships(),
        api.getServices(),
      ]);
      setPackages(pkgs);
      setMemberships(mems);
      setServices(srvs);
    } catch (err) {
      console.error('Failed to load packages/memberships:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPackage({
        name: pkgName,
        price: Number(pkgPrice),
        validity_days: Number(pkgValidity),
        included_services: ['Signature Haircut', 'Hydra Glow Facial', 'Spa Pedicure'],
      });
      setShowPkgModal(false);
      setPkgName('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create package');
    }
  };

  const handleCreateMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMembership({
        name: memName,
        price: Number(memPrice),
        validity_days: Number(memValidity),
        discount_percent: Number(memDiscount),
        benefits: ['15% off all services', 'Priority weekend booking', 'Complimentary birthday blowout'],
      });
      setShowMemModal(false);
      setMemName('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create membership');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-luxury text-3xl font-bold text-[#2E0A28]">
            Packages, Memberships & Loyalty
          </h2>
          <p className="text-xs text-[#6F5B6A] mt-0.5">
            Boost customer lifetime retention with prepaid service bundles, VIP clubs and rewards.
          </p>
        </div>

        <div className="inline-flex p-1 bg-[#FAF8F5] border border-[#E8DEC8] rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('packages')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'packages' ? 'bg-[#2E0A28] text-[#FAF8F5]' : 'text-[#6F5B6A]'
            }`}
          >
            Packages ({packages.length})
          </button>
          <button
            onClick={() => setActiveTab('memberships')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'memberships' ? 'bg-[#2E0A28] text-[#FAF8F5]' : 'text-[#6F5B6A]'
            }`}
          >
            VIP Memberships ({memberships.length})
          </button>
          <button
            onClick={() => setActiveTab('loyalty')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'loyalty' ? 'bg-[#2E0A28] text-[#FAF8F5]' : 'text-[#6F5B6A]'
            }`}
          >
            Loyalty Engine
          </button>
        </div>
      </div>

      {/* Packages Tab */}
      {activeTab === 'packages' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-[#6F5B6A]">Bundled treatments offered at special combination pricing.</p>
            <button
              onClick={() => setShowPkgModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#2E0A28] text-[#FAF8F5] font-semibold text-xs flex items-center space-x-1 hover:bg-[#3E1137]"
            >
              <Plus className="w-3.5 h-3.5 text-[#DFB76C]" />
              <span>New Package</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.length === 0 ? (
              <div className="col-span-full p-12 text-center text-[#8C7A87] bg-white rounded-2xl border border-[#E8DEC8]">
                <Award className="w-12 h-12 mx-auto mb-3 text-[#D8CCC4]" />
                <p className="text-sm font-semibold text-[#4A3845]">No packages created yet</p>
                <p className="text-xs mt-1">Create bridal, party or grooming packages to increase ticket size.</p>
              </div>
            ) : (
              packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-5 rounded-2xl border border-[#E8DEC8] bg-white shadow-xs space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-serif-luxury text-lg font-bold text-[#2E0A28]">{pkg.name}</h4>
                    <span className="font-bold text-base text-[#8C6826]">
                      {currencySymbol}{pkg.price.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#6F5B6A]">Valid for {pkg.validity_days} days from purchase.</p>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] text-xs text-[#4A3845] space-y-1">
                    <span className="font-semibold block text-[10px] uppercase text-[#8C7A87]">
                      Included Services:
                    </span>
                    <p>Signature Haircut, Hydra Glow Facial, Spa Pedicure</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Memberships Tab */}
      {activeTab === 'memberships' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-[#6F5B6A]">Annual & seasonal subscription clubs with recurring loyalty discounts.</p>
            <button
              onClick={() => setShowMemModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#2E0A28] text-[#FAF8F5] font-semibold text-xs flex items-center space-x-1 hover:bg-[#3E1137]"
            >
              <Plus className="w-3.5 h-3.5 text-[#DFB76C]" />
              <span>New Membership Tier</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {memberships.length === 0 ? (
              <div className="col-span-full p-12 text-center text-[#8C7A87] bg-white rounded-2xl border border-[#E8DEC8]">
                <Crown className="w-12 h-12 mx-auto mb-3 text-[#D8CCC4]" />
                <p className="text-sm font-semibold text-[#4A3845]">No membership clubs configured</p>
                <p className="text-xs mt-1">Configure Gold, Platinum or VIP tiers to lock in repeat client visits.</p>
              </div>
            ) : (
              memberships.map((mem) => (
                <div
                  key={mem.id}
                  className="p-5 rounded-2xl border border-[#C59A45]/40 bg-gradient-to-b from-[#FAF8F5] to-white shadow-xs space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <Crown className="w-5 h-5 text-[#C59A45]" />
                      <h4 className="font-serif-luxury text-lg font-bold text-[#2E0A28]">{mem.name}</h4>
                    </div>
                    <span className="font-bold text-base text-[#2E0A28]">
                      {currencySymbol}{mem.price.toLocaleString()}
                    </span>
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded-full bg-[#DFB76C]/20 text-[#8C6826] font-bold text-[10px] uppercase">
                    {mem.discount_percent}% Member Discount on all Services
                  </span>
                  <p className="text-xs text-[#6F5B6A]">Validity: {mem.validity_days} days</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Loyalty Engine Tab */}
      {activeTab === 'loyalty' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8DEC8] shadow-xs space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#2E0A28] flex items-center justify-center text-[#DFB76C]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">
                Gild & Glow Rewards Rules
              </h3>
              <p className="text-xs text-[#6F5B6A]">
                Automatic client points crediting during POS billing checkout.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] space-y-1">
              <span className="font-bold text-[#2E0A28] block">Earning Ratio</span>
              <p className="text-[#6F5B6A]">1 Loyalty Point earned for every ₹100 spent on completed invoices.</p>
            </div>
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] space-y-1">
              <span className="font-bold text-[#2E0A28] block">Redemption Value</span>
              <p className="text-[#6F5B6A]">1 Point = ₹1.00 applicable as flat POS bill credit on future treatments.</p>
            </div>
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] space-y-1">
              <span className="font-bold text-[#2E0A28] block">Safety Safeguard</span>
              <p className="text-[#6F5B6A]">Double point crediting is prevented via atomic database transactions.</p>
            </div>
          </div>
        </div>
      )}

      {/* Package Creation Modal */}
      {showPkgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-[#E8DEC8] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DEC8] pb-3">
              <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">Create Package</h3>
              <button onClick={() => setShowPkgModal(false)} className="text-[#8C7A87] hover:text-[#2E0A28]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePackage} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Package Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bridal Glow Package"
                  value={pkgName}
                  onChange={(e) => setPkgName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Package Price *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={pkgPrice}
                    onChange={(e) => setPkgPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={pkgValidity}
                    onChange={(e) => setPkgValidity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
                  />
                </div>
              </div>
              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPkgModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8CCC4] text-[#4A3845]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2E0A28] text-[#FAF8F5] font-semibold"
                >
                  Save Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Membership Creation Modal */}
      {showMemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-[#E8DEC8] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DEC8] pb-3">
              <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">Create Membership Tier</h3>
              <button onClick={() => setShowMemModal(false)} className="text-[#8C7A87] hover:text-[#2E0A28]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateMembership} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Membership Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gild & Glow Gold VIP"
                  value={memName}
                  onChange={(e) => setMemName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Membership Fee *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={memPrice}
                    onChange={(e) => setMemPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Discount % *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={memDiscount}
                    onChange={(e) => setMemDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
                  />
                </div>
              </div>
              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowMemModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8CCC4] text-[#4A3845]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2E0A28] text-[#FAF8F5] font-semibold"
                >
                  Save Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
