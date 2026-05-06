export type Item = {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  brand: string | null;
  color: string | null;
  size: string | null;
  material: string | null;
  cost_cents: number;
  price_cents: number;
  quantity: number;
  reorder_point: number;
  supplier: string | null;
  location: string | null;
  notes: string | null;
  is_rental: number;
  created_at: string;
  updated_at: string;
};

export type Sale = {
  id: number;
  sold_at: string;
  total_cents: number;
  customer_name: string | null;
  payment_method: string | null;
  notes: string | null;
};

export type SaleItem = {
  id: number;
  sale_id: number;
  item_id: number;
  quantity: number;
  unit_price_cents: number;
  size_at_sale: string | null;
  category_at_sale: string | null;
};

export type Appointment = {
  id: number;
  type: "custom_suit" | "rental" | "fitting" | "consultation";
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  appointment_date: string;
  event_date: string | null;
  garment_expected_date: string | null;
  garment_delivered_date: string | null;
  rental_return_date: string | null;
  status: "scheduled" | "in_progress" | "ready" | "completed" | "cancelled";
  garment_description: string | null;
  measurements: string | null;
  deposit_cents: number;
  total_cents: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SizeSalesRow = {
  category: string;
  size: string | null;
  units: number;
  revenue_cents: number;
};

export type CategorySalesRow = {
  category: string;
  units: number;
  revenue_cents: number;
};
