import {
  Owner,
  SalonSettings,
  Customer,
  Service,
  Product,
  Appointment,
  Invoice,
  Expense,
  Staff,
  StaffAttendance,
  Package,
  Membership,
  DashboardMetrics,
  RevisitItem,
} from '../types/salon.ts';

const TOKEN_KEY = 'gild_glow_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  getAuthStatus: () => request<{ initialized: boolean; authenticated: boolean; owner: Owner | null; salon: SalonSettings | null }>('/api/auth/status'),
  setup: (payload: any) => request<{ success: boolean; token: string; owner: Owner; salon: SalonSettings }>('/api/auth/setup', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  login: (credentials: { email: string; password: string }) => request<{ success: boolean; token: string; owner: Owner; salon: SalonSettings }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  register: (payload: { name: string; email: string; password: string; phone?: string; businessName?: string }) =>
    request<{ success: boolean; token: string; owner: Owner; salon: SalonSettings }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  googleLogin: (payload: { email: string; name?: string | null }) => request<{ success: boolean; token: string; owner: Owner; salon: SalonSettings }>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  logout: () => request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  resetPassword: (payload: { email: string; phone?: string; newPassword: string }) => request<{ success: boolean; message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Salon Settings
  getSalonSettings: () => request<SalonSettings>('/api/salon/settings'),
  updateSalonSettings: (payload: Partial<SalonSettings>) => request<SalonSettings>('/api/salon/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),

  // Dashboard
  getDashboard: (range: 'today' | 'week' | 'month' | 'all' = 'today') =>
    request<{ metrics: DashboardMetrics; lowStockProducts: Product[]; recentInvoices: Invoice[] }>(`/api/dashboard?range=${range}`),

  // Customers
  getCustomers: (search?: string) => request<Customer[]>(`/api/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getCustomer: (id: string) => request<{
    customer: Customer;
    invoices: Invoice[];
    appointments: Appointment[];
    loyaltyHistory: any[];
    nextRevisit: any;
  }>(`/api/customers/${id}`),
  createCustomer: (customer: Partial<Customer>) => request<Customer>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  }),
  updateCustomer: (id: string, customer: Partial<Customer>) => request<Customer>(`/api/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customer),
  }),
  deleteCustomer: (id: string) => request<{ success: boolean }>(`/api/customers/${id}`, { method: 'DELETE' }),

  // Services
  getServices: () => request<Service[]>('/api/services'),
  createService: (service: Partial<Service>) => request<Service>('/api/services', {
    method: 'POST',
    body: JSON.stringify(service),
  }),
  updateService: (id: string, service: Partial<Service>) => request<Service>(`/api/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(service),
  }),
  deleteService: (id: string) => request<{ success: boolean }>(`/api/services/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: () => request<Product[]>('/api/products'),
  createProduct: (product: Partial<Product>) => request<Product>('/api/products', {
    method: 'POST',
    body: JSON.stringify(product),
  }),
  updateProduct: (id: string, product: Partial<Product>) => request<Product>(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  }),
  adjustStock: (id: string, payload: { movement_type: string; quantity: number; notes?: string }) =>
    request<Product>(`/api/products/${id}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Appointments
  getAppointments: (params?: { date?: string; month?: string; status?: string }) => {
    const qs = new URLSearchParams(params as any).toString();
    return request<Appointment[]>(`/api/appointments${qs ? `?${qs}` : ''}`);
  },
  createAppointment: (appointment: Partial<Appointment>) => request<Appointment>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(appointment),
  }),
  updateAppointmentStatus: (id: string, status: string) => request<Appointment>(`/api/appointments/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),
  deleteAppointment: (id: string) => request<{ success: boolean }>(`/api/appointments/${id}`, { method: 'DELETE' }),

  // Billing / POS
  createInvoice: (payload: {
    customer_id: string;
    appointment_id?: string | null;
    items: Array<{
      item_type: 'service' | 'product';
      item_id: string;
      item_name: string;
      quantity: number;
      unit_price: number;
      staff_id?: string | null;
    }>;
    discount_type?: 'percentage' | 'fixed';
    discount_val?: number;
    tax_rate?: number;
    paid_amount?: number;
    payment_method?: string;
    notes?: string;
  }) => request<Invoice>('/api/billing/create-invoice', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Invoices
  getInvoices: (params?: { customer_id?: string; status?: string }) => {
    const qs = new URLSearchParams(params as any).toString();
    return request<Invoice[]>(`/api/invoices${qs ? `?${qs}` : ''}`);
  },
  getInvoice: (id: string) => request<Invoice>(`/api/invoices/${id}`),
  addPaymentToInvoice: (id: string, payload: { amount: number; method: string; notes?: string }) =>
    request<Invoice>(`/api/invoices/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Expenses
  getExpenses: (month?: string) => request<Expense[]>(`/api/expenses${month ? `?month=${month}` : ''}`),
  createExpense: (expense: Partial<Expense>) => request<Expense>('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(expense),
  }),
  deleteExpense: (id: string) => request<{ success: boolean }>(`/api/expenses/${id}`, { method: 'DELETE' }),

  // Staff & Attendance
  getStaff: () => request<Staff[]>('/api/staff'),
  createStaff: (staff: Partial<Staff>) => request<Staff>('/api/staff', {
    method: 'POST',
    body: JSON.stringify(staff),
  }),
  updateStaff: (id: string, staff: Partial<Staff>) => request<Staff>(`/api/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify(staff),
  }),
  getAttendance: (date: string) => request<StaffAttendance[]>(`/api/staff/attendance?date=${date}`),
  recordAttendance: (payload: Partial<StaffAttendance>) => request<StaffAttendance>('/api/staff/attendance', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Packages & Memberships
  getPackages: () => request<Package[]>('/api/packages'),
  createPackage: (pkg: Partial<Package>) => request<Package>('/api/packages', {
    method: 'POST',
    body: JSON.stringify(pkg),
  }),
  getMemberships: () => request<Membership[]>('/api/memberships'),
  createMembership: (mem: Partial<Membership>) => request<Membership>('/api/memberships', {
    method: 'POST',
    body: JSON.stringify(mem),
  }),

  // Retention & WhatsApp
  getRetentionRadar: () => request<{
    radar: RevisitItem[];
    birthdays: Array<{ customerId: string; customerName: string; phone: string; birthday: string; daysUntil: number }>;
    logs: any[];
  }>('/api/retention/revisit-radar'),
  sendReminder: (payload: { customer_id: string; type?: string; message_body: string; template_name?: string }) =>
    request<{ success: boolean; simulated: boolean; status: string; reminderId: string; message: string }>('/api/retention/send-reminder', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Reports
  getReports: (startDate?: string, endDate?: string) => {
    const qs = new URLSearchParams();
    if (startDate) qs.set('start_date', startDate);
    if (endDate) qs.set('end_date', endDate);
    return request<any>(`/api/reports${qs.toString() ? `?${qs.toString()}` : ''}`);
  },
};
