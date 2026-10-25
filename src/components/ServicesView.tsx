import React, { useState, useEffect } from 'react';
import { Scissors, Plus, Search, Edit2, Trash2, Clock, Sparkles, X, Check } from 'lucide-react';
import { api } from '../services/api.ts';
import { Service, SalonSettings } from '../types/salon.ts';

interface ServicesViewProps {
  salon: SalonSettings | null;
}

const DEFAULT_CATEGORIES = [
  'Hair Services',
  'Beauty & Skincare',
  'Nails & Feet',
  'Makeup & Occasions',
  'Spa & Wellness',
  'Men Grooming',
];

export const ServicesView: React.FC<ServicesViewProps> = ({ salon }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState('Hair Services');
  const [formDescription, setFormDescription] = useState('');
  const [formDuration, setFormDuration] = useState(45);
  const [formCostEstimate, setFormCostEstimate] = useState(0);
  const [formPrice, setFormPrice] = useState(500);
  const [formTaxRate, setFormTaxRate] = useState(salon?.tax_rate || 18.0);
  const [formInterval, setFormInterval] = useState(30);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencySymbol = salon?.currency === 'INR' ? '₹' : (salon?.currency || '₹');

  const fetchServices = async () => {
    setLoading(true);
    try {
      const data = await api.getServices();
      setServices(data);
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openAddModal = () => {
    setEditingService(null);
    setFormName('');
    setFormCode('');
    setFormCategory('Hair Services');
    setFormDescription('');
    setFormDuration(45);
    setFormCostEstimate(0);
    setFormPrice(500);
    setFormTaxRate(salon?.tax_rate || 18.0);
    setFormInterval(30);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (s: Service) => {
    setEditingService(s);
    setFormName(s.name);
    setFormCode(s.code);
    setFormCategory(s.category);
    setFormDescription(s.description || '');
    setFormDuration(s.duration_mins);
    setFormCostEstimate(s.cost_estimate);
    setFormPrice(s.price);
    setFormTaxRate(s.tax_rate);
    setFormInterval(s.revisit_interval_days);
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingService) {
        await api.updateService(editingService.id, {
          name: formName,
          code: formCode,
          category: formCategory,
          description: formDescription,
          duration_mins: Number(formDuration),
          cost_estimate: Number(formCostEstimate),
          price: Number(formPrice),
          tax_rate: Number(formTaxRate),
          revisit_interval_days: Number(formInterval),
          is_active: 1,
        });
      } else {
        await api.createService({
          name: formName,
          code: formCode,
          category: formCategory,
          description: formDescription,
          duration_mins: Number(formDuration),
          cost_estimate: Number(formCostEstimate),
          price: Number(formPrice),
          tax_rate: Number(formTaxRate),
          revisit_interval_days: Number(formInterval),
        });
      }
      setShowModal(false);
      fetchServices();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!window.confirm(`Deactivate service "${name}"? It will be archived from current booking lists.`)) {
      return;
    }
    try {
      await api.deleteService(id);
      fetchServices();
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate service');
    }
  };

  const categories = Array.from(new Set(services.map((s) => s.category).concat(DEFAULT_CATEGORIES)));

  const filteredServices = services.filter((s) => {
    const matchCat = selectedCategory === 'all' || s.category === selectedCategory;
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-luxury text-3xl font-bold text-[#2E0A28]">
            Services Catalogue
          </h2>
          <p className="text-xs text-[#6F5B6A] mt-0.5">
            Configure treatments, pricing, durations and retention recall intervals.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C59A45] to-[#DFB76C] text-[#2E0A28] font-bold text-xs shadow-xs hover:brightness-105 active:scale-95 transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-[#2E0A28]" />
          <span>Add New Service</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DEC8] shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8C7A87] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search services by title or service code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#D8CCC4] text-xs focus:ring-2 focus:ring-[#C59A45] outline-none"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#2E0A28] text-[#FAF8F5]'
                : 'bg-[#FAF8F5] text-[#6F5B6A] hover:bg-[#EAE2D5]'
            }`}
          >
            All Categories ({services.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all ${
                selectedCategory === cat
                  ? 'bg-[#2E0A28] text-[#FAF8F5]'
                  : 'bg-[#FAF8F5] text-[#6F5B6A] hover:bg-[#EAE2D5]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.length === 0 ? (
          <div className="col-span-full p-12 text-center text-[#8C7A87] bg-white rounded-2xl border border-[#E8DEC8]">
            <Scissors className="w-12 h-12 mx-auto mb-3 text-[#D8CCC4]" />
            <p className="text-sm font-semibold text-[#4A3845]">No services found</p>
            <p className="text-xs mt-1">Click &quot;Add New Service&quot; to configure your treatment menu.</p>
          </div>
        ) : (
          filteredServices.map((s) => (
            <div
              key={s.id}
              className={`p-5 rounded-2xl border bg-white shadow-xs transition-all flex flex-col justify-between ${
                s.is_active ? 'border-[#E8DEC8] hover:border-[#C59A45]' : 'border-gray-200 opacity-60 bg-gray-50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#8C6826] bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#E8DEC8]">
                      {s.code}
                    </span>
                    <h3 className="font-serif-luxury text-lg font-bold text-[#2E0A28] mt-1 line-clamp-1">
                      {s.name}
                    </h3>
                  </div>
                  <span className="text-base font-bold text-[#2E0A28]">
                    {currencySymbol}{s.price.toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-[#6F5B6A] line-clamp-2 mt-1">
                  {s.description || 'Professional salon care treatment.'}
                </p>

                <div className="mt-4 pt-3 border-t border-[#E8DEC8] grid grid-cols-2 gap-2 text-xs text-[#6F5B6A]">
                  <div>
                    <span className="text-[10px] text-[#8C7A87] uppercase block font-semibold">Duration</span>
                    <span className="font-medium text-[#2E0A28]">{s.duration_mins} mins</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8C7A87] uppercase block font-semibold">Recall Interval</span>
                    <span className="font-medium text-[#8C6826]">{s.revisit_interval_days} days</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E8DEC8] flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#8C7A87]">{s.category}</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditModal(s)}
                    className="p-1.5 rounded-lg text-[#6F5B6A] hover:bg-[#FAF8F5] hover:text-[#2E0A28]"
                    title="Edit Service"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {s.is_active ? (
                    <button
                      onClick={() => handleDeactivate(s.id, s.name)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                      title="Deactivate Service"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Service Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-[#E8DEC8] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DEC8] pb-3">
              <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">
                {editingService ? 'Edit Service' : 'Add New Service'}
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

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Service Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Signature Hydra Glow Facial"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Service Code (SKU)</label>
                  <input
                    type="text"
                    placeholder="e.g. SKIN-01"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Category *</label>
                  <input
                    type="text"
                    list="categories-list"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none"
                  />
                  <datalist id="categories-list">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Duration (mins) *</label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Selling Price *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Estimated Cost</label>
                  <input
                    type="number"
                    min="0"
                    value={formCostEstimate}
                    onChange={(e) => setFormCostEstimate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Tax / GST Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formTaxRate}
                    onChange={(e) => setFormTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">
                    Revisit Recall Interval (days) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formInterval}
                    onChange={(e) => setFormInterval(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] text-xs font-bold text-[#8C6826]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Treatment details, steps, or benefits..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] text-xs"
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
                  disabled={isSubmitting || !formName || formPrice <= 0}
                  className="px-5 py-2 rounded-xl bg-[#2E0A28] text-[#FAF8F5] font-semibold hover:bg-[#3E1137] disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingService ? 'Update Service' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
