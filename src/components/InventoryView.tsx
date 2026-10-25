import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ArrowUpDown,
  Edit2,
  X,
  TrendingDown,
  ShoppingBag,
  CheckCircle,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Product, SalonSettings } from '../types/salon.ts';

interface InventoryViewProps {
  salon: SalonSettings | null;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ salon }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add / Edit Product Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('Haircare');
  const [formCost, setFormCost] = useState(0);
  const [formPrice, setFormPrice] = useState(0);
  const [formStock, setFormStock] = useState(0);
  const [formThreshold, setFormThreshold] = useState(5);
  const [formSupplier, setFormSupplier] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stock Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'purchase' | 'adjustment' | 'damaged'>('purchase');
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const currencySymbol = salon?.currency === 'INR' ? '₹' : (salon?.currency || '₹');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAddProductModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku('');
    setFormCategory('Haircare');
    setFormCost(200);
    setFormPrice(450);
    setFormStock(10);
    setFormThreshold(5);
    setFormSupplier('');
    setFormDescription('');
    setModalError(null);
    setShowProductModal(true);
  };

  const openEditProductModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormCategory(p.category);
    setFormCost(p.purchase_cost);
    setFormPrice(p.selling_price);
    setFormStock(p.current_stock);
    setFormThreshold(p.reorder_threshold);
    setFormSupplier(p.supplier || '');
    setFormDescription(p.description || '');
    setModalError(null);
    setShowProductModal(true);
  };

  const openAdjustModal = (p: Product) => {
    setAdjustingProduct(p);
    setAdjustType('purchase');
    setAdjustQty(1);
    setAdjustNotes('');
    setAdjustError(null);
    setShowAdjustModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          name: formName,
          sku: formSku,
          category: formCategory,
          purchase_cost: Number(formCost),
          selling_price: Number(formPrice),
          reorder_threshold: Number(formThreshold),
          supplier: formSupplier,
          description: formDescription,
          is_active: 1,
        });
      } else {
        await api.createProduct({
          name: formName,
          sku: formSku,
          category: formCategory,
          purchase_cost: Number(formCost),
          selling_price: Number(formPrice),
          current_stock: Number(formStock),
          reorder_threshold: Number(formThreshold),
          supplier: formSupplier,
          description: formDescription,
        });
      }
      setShowProductModal(false);
      fetchProducts();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    setAdjustError(null);
    setIsAdjusting(true);

    try {
      await api.adjustStock(adjustingProduct.id, {
        movement_type: adjustType,
        quantity: Number(adjustQty),
        notes: adjustNotes,
      });
      setShowAdjustModal(false);
      fetchProducts();
    } catch (err: any) {
      setAdjustError(err.message || 'Failed to adjust stock');
    } finally {
      setIsAdjusting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchLowStock = !filterLowStockOnly || (p.current_stock <= p.reorder_threshold);
    return matchSearch && matchLowStock;
  });

  const lowStockCount = products.filter((p) => p.current_stock <= p.reorder_threshold).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-luxury text-3xl font-bold text-[#2E0A28]">
            Products & Inventory
          </h2>
          <p className="text-xs text-[#6F5B6A] mt-0.5">
            Track salon supplies, retail inventory, reorder thresholds, and movements.
          </p>
        </div>

        <button
          onClick={openAddProductModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C59A45] to-[#DFB76C] text-[#2E0A28] font-bold text-xs shadow-xs hover:brightness-105 active:scale-95 transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-[#2E0A28]" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DEC8] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#8C7A87] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search products by SKU, name, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#D8CCC4] text-xs focus:ring-2 focus:ring-[#C59A45] outline-none"
          />
        </div>

        <button
          onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shrink-0 ${
            filterLowStockOnly
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'bg-[#FAF8F5] text-[#6F5B6A] border border-[#E8DEC8] hover:bg-[#EAE2D5]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>Low Stock Only ({lowStockCount})</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-[#E8DEC8] shadow-xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-[#8C7A87]">
            <Package className="w-12 h-12 mx-auto mb-3 text-[#D8CCC4]" />
            <p className="text-sm font-semibold text-[#4A3845]">No inventory items found</p>
            <p className="text-xs mt-1">
              Add retail hair & skin care products to begin inventory tracking.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#6F5B6A] uppercase tracking-wider font-semibold border-b border-[#E8DEC8]">
                <tr>
                  <th className="px-6 py-3.5">Product & SKU</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Purchase Cost</th>
                  <th className="px-6 py-3.5">Selling Price</th>
                  <th className="px-6 py-3.5 text-center">Current Stock</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DEC8]">
                {filteredProducts.map((p) => {
                  const isLow = p.current_stock <= p.reorder_threshold;
                  return (
                    <tr key={p.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-[#2E0A28]">
                        <p>{p.name}</p>
                        <span className="text-[10px] font-mono font-medium text-[#8C7A87]">
                          SKU: {p.sku}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-[#4A3845]">{p.category}</td>
                      <td className="px-6 py-3.5 text-[#6F5B6A]">
                        {currencySymbol}{p.purchase_cost.toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-[#8C6826]">
                        {currencySymbol}{p.selling_price.toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 text-center font-bold text-sm">
                        <span className={isLow ? 'text-amber-700' : 'text-[#2E0A28]'}>
                          {p.current_stock}
                        </span>
                        <span className="text-[10px] font-normal text-[#8C7A87] block">
                          min {p.reorder_threshold}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        {p.current_stock === 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold uppercase">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right space-x-1">
                        <button
                          onClick={() => openAdjustModal(p)}
                          className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#D8CCC4] text-[#2E0A28] hover:bg-[#EAE2D5] font-semibold text-[11px]"
                        >
                          Adjust Stock
                        </button>
                        <button
                          onClick={() => openEditProductModal(p)}
                          className="p-1.5 rounded-lg text-[#6F5B6A] hover:bg-[#EAE2D5] hover:text-[#2E0A28]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-[#E8DEC8] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DEC8] pb-3">
              <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">
                {editingProduct ? 'Edit Product' : 'Add Retail / Stock Product'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-[#8C7A87] hover:text-[#2E0A28]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Moroccan Argan Oil Hair Serum (100ml)"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">SKU / Barcode</label>
                  <input
                    type="text"
                    placeholder="e.g. SERUM-01"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Category *</label>
                  <input
                    type="text"
                    placeholder="e.g. Haircare, Skincare, Shampoos"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Purchase Cost</label>
                  <input
                    type="number"
                    min="0"
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
                  />
                </div>
                <div>
                  <label className="block text-[#2E0A28] font-semibold mb-1">Retail Selling Price *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] font-bold text-[#8C6826]"
                  />
                </div>
              </div>

              {!editingProduct && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#2E0A28] font-semibold mb-1">Initial Stock Count</label>
                    <input
                      type="number"
                      min="0"
                      value={formStock}
                      onChange={(e) => setFormStock(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#2E0A28] font-semibold mb-1">
                      Low-Stock Threshold Alert
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formThreshold}
                      onChange={(e) => setFormThreshold(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Supplier / Vendor</label>
                <input
                  type="text"
                  placeholder="e.g. L'Oreal Professional India"
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8CCC4] text-[#4A3845] hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formName || formPrice <= 0}
                  className="px-5 py-2 rounded-xl bg-[#2E0A28] text-[#FAF8F5] font-semibold hover:bg-[#3E1137] disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-[#E8DEC8] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DEC8] pb-3">
              <div>
                <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">
                  Adjust Stock Level
                </h3>
                <p className="text-xs text-[#6F5B6A]">{adjustingProduct.name}</p>
              </div>
              <button onClick={() => setShowAdjustModal(false)} className="text-[#8C7A87] hover:text-[#2E0A28]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {adjustError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustStock} className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] flex justify-between items-center">
                <span>Current Stock in Inventory:</span>
                <span className="font-bold text-sm text-[#2E0A28]">{adjustingProduct.current_stock} units</span>
              </div>

              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Adjustment Type *</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] bg-white font-medium"
                >
                  <option value="purchase">Receive Delivery / New Purchase (+) </option>
                  <option value="adjustment">Stock Count Correction (+ / -)</option>
                  <option value="damaged">Damaged / Expired / Salon Consumed (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Quantity *</label>
                <input
                  type="number"
                  required
                  min={adjustType === 'adjustment' ? undefined : 1}
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Supplier PO #4092, damaged packaging"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4]"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8CCC4] text-[#4A3845] hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjusting || adjustQty === 0}
                  className="px-5 py-2 rounded-xl bg-[#2E0A28] text-[#FAF8F5] font-semibold hover:bg-[#3E1137] disabled:opacity-50"
                >
                  {isAdjusting ? 'Recording...' : 'Update Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
