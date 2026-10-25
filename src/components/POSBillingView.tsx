import React, { useState, useEffect } from 'react';
import {
  Search,
  UserPlus,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Scissors,
  Package,
  Sparkles,
  CreditCard,
  UserCheck,
  AlertCircle,
  Check,
  X,
} from 'lucide-react';
import { api } from '../services/api.ts';
import {
  Customer,
  Service,
  Product,
  Staff,
  SalonSettings,
  Invoice,
} from '../types/salon.ts';
import { calculateInvoiceTotals, normalizePhoneNumber } from '../utils/salonMath.ts';

interface CartItem {
  id: string; // unique cart entry id
  itemType: 'service' | 'product';
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  staffId?: string;
  availableStock?: number;
}

interface POSBillingViewProps {
  salon: SalonSettings | null;
  onInvoiceCreated: (invoice: Invoice) => void;
  prefilledAppointment?: any;
}

export const POSBillingView: React.FC<POSBillingViewProps> = ({
  salon,
  onInvoiceCreated,
  prefilledAppointment,
}) => {
  // Master data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  // Selection states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [activeCatalogTab, setActiveCatalogTab] = useState<'services' | 'products'>('services');
  const [catalogCategory, setCatalogCategory] = useState<string>('all');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Cart & Calculation state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [discountVal, setDiscountVal] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(salon?.tax_rate || 18.0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [billNotes, setBillNotes] = useState<string>('');

  // Quick Customer Creation Modal State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAllergies, setNewCustAllergies] = useState('');
  const [custModalError, setCustModalError] = useState<string | null>(null);
  const [isSubmittingCust, setIsSubmittingCust] = useState(false);

  // Checkout submission
  const [isSubmittingBill, setIsSubmittingBill] = useState(false);
  const [billError, setBillError] = useState<string | null>(null);

  const currencySymbol = salon?.currency === 'INR' ? '₹' : (salon?.currency || '₹');

  // Load initial catalog data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [c, s, p, stf] = await Promise.all([
          api.getCustomers(),
          api.getServices(),
          api.getProducts(),
          api.getStaff(),
        ]);
        setCustomers(c);
        setServices(s.filter((srv) => srv.is_active));
        setProducts(p.filter((prod) => prod.is_active));
        setStaffList(stf.filter((m) => m.status === 'active'));

        // If prefilled from appointment
        if (prefilledAppointment) {
          const matchedCust = c.find((cust) => cust.id === prefilledAppointment.customer_id);
          if (matchedCust) setSelectedCustomer(matchedCust);

          if (prefilledAppointment.service_ids && prefilledAppointment.service_ids.length > 0) {
            const initialCartItems: CartItem[] = [];
            prefilledAppointment.service_ids.forEach((srvId: string) => {
              const matchedSrv = s.find((item) => item.id === srvId);
              if (matchedSrv) {
                initialCartItems.push({
                  id: 'cart_' + Math.random().toString(36).substring(2, 7),
                  itemType: 'service',
                  itemId: matchedSrv.id,
                  itemName: matchedSrv.name,
                  quantity: 1,
                  unitPrice: matchedSrv.price,
                  staffId: prefilledAppointment.staff_id || undefined,
                });
              }
            });
            setCart(initialCartItems);
          }
        }
      } catch (err) {
        console.error('Failed to load POS data:', err);
      }
    };
    loadData();
  }, [prefilledAppointment]);

  // Derived calculations
  const totals = calculateInvoiceTotals(
    cart.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
    discountType,
    discountVal,
    taxRate,
    paidAmount === '' ? 0 : Number(paidAmount)
  );

  // Set default paid amount whenever grand total changes and user hasn't explicitly customized
  const handleSetFullPayment = () => {
    setPaidAmount(totals.grandTotal);
  };

  // Add Item to Cart
  const addToCart = (item: Service | Product, type: 'service' | 'product') => {
    setBillError(null);
    if (type === 'product') {
      const prod = item as Product;
      if (prod.current_stock <= 0) {
        setBillError(`Cannot add "${prod.name}" - out of stock.`);
        return;
      }
      const existing = cart.find((i) => i.itemId === prod.id && i.itemType === 'product');
      if (existing) {
        if (existing.quantity >= prod.current_stock) {
          setBillError(`Maximum available stock reached for ${prod.name} (${prod.current_stock} in inventory).`);
          return;
        }
        setCart(
          cart.map((i) => (i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i))
        );
        return;
      }
    }

    const newItem: CartItem = {
      id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      itemType: type,
      itemId: item.id,
      itemName: item.name,
      quantity: 1,
      unitPrice: type === 'service' ? (item as Service).price : (item as Product).selling_price,
      staffId: staffList.length > 0 ? staffList[0].id : undefined,
      availableStock: type === 'product' ? (item as Product).current_stock : undefined,
    };
    setCart([...cart, newItem]);
  };

  const updateCartQty = (id: string, delta: number) => {
    setBillError(null);
    setCart(
      cart
        .map((i) => {
          if (i.id !== id) return i;
          const nextQty = i.quantity + delta;
          if (nextQty <= 0) return null;
          if (i.itemType === 'product' && i.availableStock !== undefined && nextQty > i.availableStock) {
            setBillError(`Only ${i.availableStock} units of "${i.itemName}" available in stock.`);
            return i;
          }
          return { ...i, quantity: nextQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeCartItem = (id: string) => {
    setCart(cart.filter((i) => i.id !== id));
  };

  const updateStaffAssignment = (cartItemId: string, staffId: string) => {
    setCart(cart.map((i) => (i.id === cartItemId ? { ...i, staffId } : i)));
  };

  // Quick Customer Creation
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustModalError(null);
    setIsSubmittingCust(true);

    try {
      const created = await api.createCustomer({
        name: newCustName,
        phone: newCustPhone,
        email: newCustEmail || null,
        allergies: newCustAllergies || null,
      });
      setCustomers([created, ...customers]);
      setSelectedCustomer(created);
      setShowAddCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      setNewCustAllergies('');
    } catch (err: any) {
      setCustModalError(err.message || 'Failed to create customer');
    } finally {
      setIsSubmittingCust(false);
    }
  };

  // Checkout Bill
  const handleCheckout = async () => {
    setBillError(null);
    if (!selectedCustomer) {
      setBillError('Please select or create a customer for this invoice.');
      return;
    }
    if (cart.length === 0) {
      setBillError('Please add at least one service or product item to the bill.');
      return;
    }

    const finalPaid = paidAmount === '' ? totals.grandTotal : Number(paidAmount);
    if (finalPaid < 0) {
      setBillError('Paid amount cannot be negative.');
      return;
    }

    setIsSubmittingBill(true);

    try {
      const invoice = await api.createInvoice({
        customer_id: selectedCustomer.id,
        appointment_id: prefilledAppointment?.id || null,
        items: cart.map((i) => ({
          item_type: i.itemType,
          item_id: i.itemId,
          item_name: i.itemName,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          staff_id: i.staffId || null,
        })),
        discount_type: discountType,
        discount_val: Number(discountVal) || 0,
        tax_rate: Number(taxRate) || 0,
        paid_amount: finalPaid,
        payment_method: paymentMethod,
        notes: billNotes,
      });

      // Clear bill
      setCart([]);
      setSelectedCustomer(null);
      setPaidAmount('');
      setDiscountVal(0);
      setBillNotes('');

      // Refresh product stock
      const updatedProducts = await api.getProducts();
      setProducts(updatedProducts.filter((p) => p.is_active));

      onInvoiceCreated(invoice);
    } catch (err: any) {
      setBillError(err.message || 'Invoice checkout failed');
    } finally {
      setIsSubmittingBill(false);
    }
  };

  // Filter Catalog
  const categories = Array.from(
    new Set(
      activeCatalogTab === 'services'
        ? services.map((s) => s.category)
        : products.map((p) => p.category)
    )
  );

  const filteredCatalog =
    activeCatalogTab === 'services'
      ? services.filter((s) => {
          const matchCat = catalogCategory === 'all' || s.category === catalogCategory;
          const matchSearch =
            !catalogSearch ||
            s.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
            s.code.toLowerCase().includes(catalogSearch.toLowerCase());
          return matchCat && matchSearch;
        })
      : products.filter((p) => {
          const matchCat = catalogCategory === 'all' || p.category === catalogCategory;
          const matchSearch =
            !catalogSearch ||
            p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
            p.sku.toLowerCase().includes(catalogSearch.toLowerCase());
          return matchCat && matchSearch;
        });

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch) ||
      c.normalized_phone.includes(customerSearch)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN: Customer Selection & Catalog Picker (7 cols) */}
      <div className="lg:col-span-7 space-y-5">
        {/* Customer Selection Card */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DEC8] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#2E0A28] uppercase tracking-wider">
              1. Customer Details *
            </span>
            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="text-xs font-semibold text-[#8C6826] hover:underline flex items-center space-x-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ New Customer</span>
            </button>
          </div>

          {!selectedCustomer ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-[#8C7A87] absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search customer by name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#D8CCC4] text-xs focus:ring-2 focus:ring-[#C59A45] outline-none"
                />
              </div>

              {customerSearch.trim() && (
                <div className="max-h-48 overflow-y-auto divide-y divide-[#E8DEC8] rounded-xl border border-[#E8DEC8] bg-[#FAF8F5]">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[#8C7A87]">
                      No existing customer found. Click &quot;+ New Customer&quot; above to add.
                    </div>
                  ) : (
                    filteredCustomers.slice(0, 5).map((cust) => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(cust);
                          setCustomerSearch('');
                        }}
                        className="w-full text-left p-2.5 hover:bg-white flex items-center justify-between transition-colors text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#2E0A28]">{cust.name}</p>
                          <p className="text-[11px] text-[#6F5B6A]">{cust.phone}</p>
                        </div>
                        {cust.allergies && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold">
                            Allergies
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#2E0A28]">{selectedCustomer.name}</p>
                <p className="text-xs text-[#6F5B6A]">{selectedCustomer.phone}</p>
                {selectedCustomer.allergies && (
                  <p className="text-[11px] text-rose-700 font-semibold mt-0.5">
                    ⚠️ Caution: {selectedCustomer.allergies}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-2.5 py-1 text-xs text-[#6F5B6A] hover:text-rose-700 rounded-lg hover:bg-white border border-transparent hover:border-[#D8CCC4]"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Catalog Selector */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DEC8] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-[#2E0A28] uppercase tracking-wider">
              2. Add Services & Products
            </span>

            {/* Toggle Services vs Products */}
            <div className="inline-flex p-1 bg-[#FAF8F5] border border-[#E8DEC8] rounded-xl self-start">
              <button
                onClick={() => {
                  setActiveCatalogTab('services');
                  setCatalogCategory('all');
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeCatalogTab === 'services'
                    ? 'bg-[#2E0A28] text-[#FAF8F5]'
                    : 'text-[#6F5B6A] hover:text-[#2E0A28]'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Services ({services.length})</span>
              </button>
              <button
                onClick={() => {
                  setActiveCatalogTab('products');
                  setCatalogCategory('all');
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeCatalogTab === 'products'
                    ? 'bg-[#2E0A28] text-[#FAF8F5]'
                    : 'text-[#6F5B6A] hover:text-[#2E0A28]'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Retail Stock ({products.length})</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-[#8C7A87] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={`Search ${activeCatalogTab}...`}
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#D8CCC4] text-xs focus:ring-1 focus:ring-[#C59A45] outline-none"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                onClick={() => setCatalogCategory('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 ${
                  catalogCategory === 'all'
                    ? 'bg-[#2E0A28] text-[#FAF8F5]'
                    : 'bg-[#FAF8F5] text-[#6F5B6A] hover:bg-[#EAE2D5]'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCatalogCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 ${
                    catalogCategory === cat
                      ? 'bg-[#2E0A28] text-[#FAF8F5]'
                      : 'bg-[#FAF8F5] text-[#6F5B6A] hover:bg-[#EAE2D5]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
            {filteredCatalog.length === 0 ? (
              <div className="col-span-2 p-8 text-center text-xs text-[#8C7A87]">
                No {activeCatalogTab} matching criteria.
              </div>
            ) : (
              filteredCatalog.map((item) => {
                const isProduct = activeCatalogTab === 'products';
                const price = isProduct ? (item as Product).selling_price : (item as Service).price;
                const stock = isProduct ? (item as Product).current_stock : null;
                const isOutOfStock = isProduct && (stock || 0) <= 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => addToCart(item, activeCatalogTab === 'services' ? 'service' : 'product')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isOutOfStock
                        ? 'opacity-40 bg-gray-50 border-gray-200 cursor-not-allowed'
                        : 'bg-[#FAF8F5] border-[#E8DEC8] hover:border-[#C59A45] hover:bg-white active:scale-98 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-bold text-[#2E0A28] line-clamp-1">{item.name}</span>
                        <span className="text-xs font-bold text-[#8C6826] shrink-0 ml-2">
                          {currencySymbol}{price.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#6F5B6A] mt-0.5">{item.category}</p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#E8DEC8]/60 flex items-center justify-between text-[10px]">
                      {isProduct ? (
                        <span className={stock! <= 3 ? 'text-amber-700 font-semibold' : 'text-[#6F5B6A]'}>
                          Stock: {stock} units
                        </span>
                      ) : (
                        <span className="text-[#6F5B6A]">
                          {(item as Service).duration_mins} mins
                        </span>
                      )}
                      <span className="text-[#8C6826] font-semibold flex items-center space-x-0.5">
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Active Cart / Bill Summary (5 cols) */}
      <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-[#E8DEC8] shadow-md space-y-5 sticky top-22">
        <div className="flex items-center justify-between border-b border-[#E8DEC8] pb-3">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-[#8C6826]" />
            <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">Current Bill</h3>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#2E0A28] border border-[#E8DEC8]">
            {cart.reduce((s, i) => s + i.quantity, 0)} items
          </span>
        </div>

        {billError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{billError}</span>
          </div>
        )}

        {/* Cart Items List */}
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {cart.length === 0 ? (
            <div className="p-8 text-center text-[#8C7A87] text-xs">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-[#D8CCC4]" />
              <p>Bill is currently empty.</p>
              <p className="text-[11px] mt-0.5">Select services or products from the catalogue.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] space-y-2 text-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-[#2E0A28] leading-tight">{item.itemName}</p>
                    <span className="text-[10px] text-[#6F5B6A] capitalize">{item.itemType}</span>
                  </div>
                  <span className="font-bold text-[#2E0A28]">
                    {currencySymbol}{(item.unitPrice * item.quantity).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {/* Staff attribution for services */}
                  {item.itemType === 'service' && staffList.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] text-[#8C7A87]">Staff:</span>
                      <select
                        value={item.staffId || ''}
                        onChange={(e) => updateStaffAssignment(item.id, e.target.value)}
                        className="text-[11px] bg-white border border-[#D8CCC4] rounded px-1.5 py-0.5"
                      >
                        {staffList.map((stf) => (
                          <option key={stf.id} value={stf.id}>
                            {stf.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Quantity stepper */}
                  <div className="flex items-center space-x-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.id, -1)}
                      className="w-6 h-6 rounded bg-white border border-[#D8CCC4] flex items-center justify-center hover:bg-[#EAE2D5]"
                    >
                      <Minus className="w-3 h-3 text-[#2E0A28]" />
                    </button>
                    <span className="font-bold text-xs w-4 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.id, 1)}
                      className="w-6 h-6 rounded bg-white border border-[#D8CCC4] flex items-center justify-center hover:bg-[#EAE2D5]"
                    >
                      <Plus className="w-3 h-3 text-[#2E0A28]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCartItem(item.id)}
                      className="p-1 text-[#8C7A87] hover:text-rose-700 ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Discount & Tax Controls */}
        <div className="border-t border-[#E8DEC8] pt-3 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[#6F5B6A] mb-1 font-medium">Discount</label>
              <div className="flex">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="bg-[#FAF8F5] border border-r-0 border-[#D8CCC4] rounded-l-lg px-2 text-xs"
                >
                  <option value="fixed">{currencySymbol}</option>
                  <option value="percentage">%</option>
                </select>
                <input
                  type="number"
                  min="0"
                  value={discountVal}
                  onChange={(e) => setDiscountVal(Math.max(0, Number(e.target.value)))}
                  className="w-full px-2 py-1 border border-[#D8CCC4] rounded-r-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#6F5B6A] mb-1 font-medium">Tax / GST (%)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(Math.max(0, Number(e.target.value)))}
                className="w-full px-2 py-1 border border-[#D8CCC4] rounded-lg text-xs bg-white"
              />
            </div>
          </div>

          {/* Subtotal & Calculations */}
          <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E8DEC8] space-y-1 text-xs">
            <div className="flex justify-between text-[#6F5B6A]">
              <span>Subtotal:</span>
              <span className="font-semibold text-[#2E0A28]">{currencySymbol}{totals.subtotal.toLocaleString()}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span>- {currencySymbol}{totals.discountAmount.toLocaleString()}</span>
              </div>
            )}
            {totals.taxAmount > 0 && (
              <div className="flex justify-between text-[#6F5B6A]">
                <span>Tax ({taxRate}%):</span>
                <span>{currencySymbol}{totals.taxAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="border-t border-[#D8CCC4] pt-1 flex justify-between text-sm font-bold text-[#2E0A28]">
              <span>Grand Total:</span>
              <span className="text-[#8C6826]">{currencySymbol}{totals.grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Payment Tender Selection */}
        <div className="border-t border-[#E8DEC8] pt-3 space-y-3 text-xs">
          <div>
            <label className="block text-[#6F5B6A] mb-1 font-medium">Payment Method *</label>
            <div className="grid grid-cols-4 gap-1.5">
              {['cash', 'upi', 'card', 'bank_transfer'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`py-1.5 rounded-lg font-semibold text-[11px] capitalize border transition-all ${
                    paymentMethod === m
                      ? 'bg-[#2E0A28] text-[#FAF8F5] border-[#2E0A28]'
                      : 'bg-[#FAF8F5] text-[#4A3845] border-[#D8CCC4] hover:bg-white'
                  }`}
                >
                  {m === 'bank_transfer' ? 'Bank' : m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[#6F5B6A] font-medium">Tender Amount Paid</label>
              <button
                type="button"
                onClick={handleSetFullPayment}
                className="text-[11px] text-[#8C6826] font-semibold hover:underline"
              >
                Full ({currencySymbol}{totals.grandTotal})
              </button>
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder={`Default: ${totals.grandTotal}`}
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] text-xs font-bold bg-white"
            />
          </div>

          {/* Balance Due Alert */}
          {totals.balanceDue > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex justify-between items-center text-xs">
              <span>Balance Due (Outstanding):</span>
              <span className="font-bold">{currencySymbol}{totals.balanceDue.toLocaleString()}</span>
            </div>
          )}

          {/* Generate Invoice Action Button */}
          <button
            type="button"
            disabled={isSubmittingBill || cart.length === 0 || !selectedCustomer}
            onClick={handleCheckout}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#C59A45] to-[#DFB76C] text-[#2E0A28] font-bold text-sm shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Receipt className="w-4 h-4 text-[#2E0A28]" />
            <span>{isSubmittingBill ? 'Processing Invoice...' : `Generate & Print Bill (${currencySymbol}${totals.grandTotal})`}</span>
          </button>
        </div>
      </div>

      {/* MODAL: QUICK ADD CUSTOMER */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-[#E8DEC8] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DEC8] pb-3">
              <h3 className="font-serif-luxury text-xl font-bold text-[#2E0A28]">
                Add New Customer
              </h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-[#8C7A87] hover:text-[#2E0A28]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {custModalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {custModalError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none"
                />
              </div>

              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="+91 9876543210"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none"
                />
                <p className="text-[10px] text-[#8C7A87] mt-0.5">
                  Normalized automatically for duplicate detection.
                </p>
              </div>

              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none"
                />
              </div>

              <div>
                <label className="block text-[#2E0A28] font-semibold mb-1">
                  Allergies / Chemical Precautions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ammonia sensitivity, latex allergy"
                  value={newCustAllergies}
                  onChange={(e) => setNewCustAllergies(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CCC4] focus:ring-2 focus:ring-[#C59A45] outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8CCC4] text-[#4A3845] hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCust || !newCustName || !newCustPhone}
                  className="px-5 py-2 rounded-xl bg-[#2E0A28] text-[#FAF8F5] font-semibold hover:bg-[#3E1137] disabled:opacity-50"
                >
                  {isSubmittingCust ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
