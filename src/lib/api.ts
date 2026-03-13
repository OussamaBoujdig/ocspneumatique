const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(path: string, data?: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// Auth
export interface Tenant {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone: string;
  subscription_plan: string;
  subscription_status: string;
}

export interface AuthUser {
  id: number;
  tenant_id: number;
  name: string;
  email: string;
  role: string;
  tenant_name: string;
  tenant?: Tenant;
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const data = await request<{ token: string; user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("token", data.token);
  return data;
}

export async function registerTenant(data: {
  tenant_name: string; tenant_slug: string; name: string; email: string; password: string; phone?: string;
}): Promise<{ token: string; user: AuthUser; tenant: Tenant }> {
  const result = await request<{ token: string; user: AuthUser; tenant: Tenant }>("/auth/register-tenant", {
    method: "POST",
    body: JSON.stringify(data),
  });
  localStorage.setItem("token", result.token);
  return result;
}

export function logout() {
  localStorage.removeItem("token");
}

export async function getMe(): Promise<AuthUser> {
  return request<AuthUser>("/auth/me");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// Types
export interface Customer {
  id: number;
  tenant_id: number;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  tags: string | null;
  total_spent: number;
  visit_count: number;
  vehicle_count?: number;
  last_visit?: string;
  created_at: string;
  updated_at: string;
  vehicles?: Vehicle[];
  appointments?: Appointment[];
}

export interface Vehicle {
  id: number;
  tenant_id: number;
  customer_id: number;
  customer_name?: string;
  brand: string;
  model: string;
  year: number | null;
  license_plate: string | null;
  vin: string | null;
  tire_size: string | null;
  mileage: number;
  color: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tire_installations?: TireInstallation[];
  work_orders?: WorkOrder[];
}

export interface TireBrand {
  id: number;
  name: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
}

export interface Tire {
  id: number;
  tenant_id: number;
  brand_id: number | null;
  brand_name: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  model: string;
  size: string;
  season: "summer" | "winter" | "all_season" | "sport";
  barcode: string | null;
  dot_code: string | null;
  purchase_price: number;
  sale_price: number;
  stock_qty: number;
  min_stock: number;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: number;
  tenant_id: number;
  name: string;
  description: string | null;
  category: string;
  default_price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface Employee {
  id: number;
  tenant_id: number;
  user_id: number | null;
  name: string;
  phone: string | null;
  email?: string | null;
  role_title: string | null;
  specialization: string | null;
  hourly_rate: number;
  is_active: boolean;
  hire_date: string | null;
  notes: string | null;
  completed_orders?: number;
  revenue_generated?: number;
  created_at: string;
}

export interface Appointment {
  id: number;
  tenant_id: number;
  customer_id: number | null;
  vehicle_id: number | null;
  employee_id: number | null;
  service_id: number | null;
  full_name: string;
  phone: string;
  email: string | null;
  customer_name?: string;
  vehicle_info: string | null;
  vehicle_brand?: string;
  vehicle_model?: string;
  license_plate?: string;
  employee_name?: string;
  service_name?: string;
  service_type: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrder {
  id: number;
  tenant_id: number;
  appointment_id: number | null;
  customer_id: number | null;
  vehicle_id: number | null;
  assigned_to: number | null;
  customer_name: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  license_plate: string | null;
  employee_name: string | null;
  status: string;
  priority: "low" | "normal" | "high" | "urgent";
  technician_name: string | null;
  estimated_duration: number | null;
  actual_duration: number | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  items?: WorkOrderItem[];
}

export interface WorkOrderItem {
  id: number;
  work_order_id: number;
  service_id: number | null;
  tire_id: number | null;
  service_name?: string;
  tire_model?: string;
  tire_size?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: number;
  tenant_id: number;
  invoice_number: string;
  work_order_id: number | null;
  customer_id: number | null;
  customer_name: string | null;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  subtotal: number;
  discount_amount: number;
  discount_type: "percent" | "fixed";
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  payment_method: string;
  status: string;
  is_credit_note: boolean;
  original_invoice_id: number | null;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface TireInstallation {
  id: number;
  vehicle_id: number;
  tire_id: number | null;
  position: string;
  tire_brand: string;
  tire_model: string;
  tire_size: string;
  installed_at: string;
  mileage_at_install: number | null;
  removed_at: string | null;
}

export interface DashboardStats {
  customers: number;
  vehicles: number;
  todayAppointments: number;
  activeAppointments: number;
  openOrders: number;
  completedToday: number;
  lowStock: number;
  tiresSoldThisMonth: number;
  monthRevenue: number;
  yearRevenue: number;
  unpaidInvoices: { count: number; total: number };
  recentAppointments: Appointment[];
  revenueByMonth: { month: string; total: number }[];
  topServices: { name: string; count: number }[];
  employeeStats: { name: string; completed_orders: number; revenue: number }[];
}

export interface AnalyticsRevenue {
  date: string;
  revenue: number;
  invoice_count: number;
}

export interface AnalyticsService {
  service_name: string;
  count: number;
  revenue: number;
}
