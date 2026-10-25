export interface Owner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
}

export interface SalonSettings {
  id: string;
  business_name: string;
  business_types: string[];
  tagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  currency: string;
  tax_rate: number;
  invoice_prefix: string;
  default_duration_mins: number;
  opening_time?: string;
  closing_time?: string;
  weekly_off?: string;
  whatsapp_enabled?: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  normalized_phone: string;
  email?: string | null;
  birthday?: string | null;
  gender?: string | null;
  notes?: string | null;
  allergies?: string | null;
  marketing_consent: number;
  whatsapp_consent: number;
  loyalty_points: number;
  visit_count?: number;
  total_spent?: number;
  last_visit_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  code: string;
  category: string;
  description?: string;
  duration_mins: number;
  cost_estimate: number;
  price: number;
  tax_rate: number;
  revisit_interval_days: number;
  is_active: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  description?: string;
  purchase_cost: number;
  selling_price: number;
  current_stock: number;
  reorder_threshold: number;
  supplier?: string;
  is_active: number;
  is_low_stock?: number;
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  invoice_id?: string;
  notes?: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  appointment_number: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  staff_id?: string | null;
  staff_name?: string | null;
  date: string;
  start_time: string;
  duration_mins: number;
  status: 'booked' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string | null;
  advance_paid: number;
  service_ids: string[];
  total_estimated: number;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_type: 'service' | 'product';
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  staff_id?: string | null;
  line_total: number;
}

export interface Payment {
  id: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  method: string;
  status: string;
  transaction_ref?: string;
  notes?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_notes?: string;
  appointment_id?: string | null;
  subtotal: number;
  discount_type: 'percentage' | 'fixed';
  discount_val: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  payment_method: string;
  status: 'paid' | 'partial' | 'pending';
  notes?: string | null;
  created_at: string;
  items?: InvoiceItem[];
  payments?: Payment[];
  salon?: SalonSettings;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  payment_method: string;
  date: string;
  notes?: string | null;
  created_at: string;
}

export interface Staff {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  job_title: string;
  assigned_categories_json?: string;
  joining_date?: string | null;
  status: string;
  working_hours?: string;
  commission_percent: number;
  created_at: string;
}

export interface StaffAttendance {
  id: string;
  staff_id: string;
  staff_name?: string;
  job_title?: string;
  date: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  status: 'present' | 'absent' | 'half_day' | 'leave';
  notes?: string | null;
}

export interface Package {
  id: string;
  name: string;
  price: number;
  validity_days: number;
  included_services_json: string;
  is_active: number;
  created_at: string;
}

export interface Membership {
  id: string;
  name: string;
  price: number;
  validity_days: number;
  discount_percent: number;
  benefits_json: string;
  is_active: number;
  created_at: string;
}

export interface RevisitItem {
  customerId: string;
  customerName: string;
  phone: string;
  serviceName: string;
  completedDate: string;
  intervalDays: number;
  targetDate: string;
  daysDifference: number;
  status: 'overdue' | 'due_today' | 'due_soon' | 'upcoming';
}

export interface DashboardMetrics {
  todaySales: number;
  monthSales: number;
  totalSales: number;
  paymentsReceived: number;
  outstandingBalance: number;
  recordedExpenses: number;
  netProfitEstimate: number;
  totalCustomers: number;
  newCustomersThisMonth: number;
  returningCustomers: number;
  todayAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalServices: number;
  totalProducts: number;
  lowStockCount: number;
  overdueRevisits: number;
  dueTodayRevisits: number;
  dueSoonRevisits: number;
}
