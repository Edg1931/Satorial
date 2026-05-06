export type Style = {
  id: number;
  style_code: string;
  name: string;
  category: string;
  brand: string | null;
  description: string | null;
  base_price_cents: number;
  base_cost_cents: number;
  is_rental: number;
  image_url: string | null;
  created_at: string;
};

export type Item = {
  id: number;
  style_id: number | null;
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

export type Customer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  birthday: string | null;
  preferences: string | null;
  notes: string | null;
  created_at: string;
};

export type Measurement = {
  id: number;
  customer_id: number;
  taken_at: string;
  taken_by: string | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  seat: number | null;
  shoulder: number | null;
  sleeve_l: number | null;
  sleeve_r: number | null;
  neck: number | null;
  bicep: number | null;
  wrist: number | null;
  jacket_length: number | null;
  back_length: number | null;
  inseam: number | null;
  outseam: number | null;
  thigh: number | null;
  knee: number | null;
  trouser_rise: number | null;
  shoe_size: number | null;
  posture: string | null;
  notes: string | null;
};

export const APPT_STAGES = [
  "scheduled",
  "measured",
  "cut",
  "first_fitting",
  "second_fitting",
  "ready",
  "delivered",
  "cancelled",
] as const;
export type ApptStage = typeof APPT_STAGES[number];

export type Appointment = {
  id: number;
  type: "custom_suit" | "rental" | "fitting" | "consultation" | "alteration";
  customer_id: number | null;
  group_order_id: number | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  appointment_date: string;
  event_date: string | null;
  garment_expected_date: string | null;
  garment_delivered_date: string | null;
  rental_pickup_date: string | null;
  rental_return_date: string | null;
  stage: ApptStage;
  status: "open" | "completed" | "cancelled";
  garment_description: string | null;
  fabric: string | null;
  style_notes: string | null;
  deposit_cents: number;
  total_cents: number;
  balance_cents: number;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type GroupOrder = {
  id: number;
  name: string;
  event_type: string | null;
  event_date: string | null;
  organizer_name: string | null;
  organizer_phone: string | null;
  organizer_email: string | null;
  notes: string | null;
  created_at: string;
};

export type Sale = {
  id: number;
  sold_at: string;
  customer_id: number | null;
  total_cents: number;
  tax_cents: number;
  discount_cents: number;
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
  name_at_sale: string | null;
};

export const SOCIAL_PLATFORMS = ["instagram", "facebook", "x", "tiktok", "linkedin"] as const;
export type SocialPlatform = typeof SOCIAL_PLATFORMS[number];

export type SocialConnection = {
  id: number;
  platform: SocialPlatform;
  account_handle: string | null;
  account_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  status: "connected" | "disconnected" | "expired";
  connected_at: string | null;
  metadata: string | null;
};

export type Staff = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: "owner" | "manager" | "sales" | "tailor";
  pin: string | null;
  active: number;
  created_at: string;
};

export type PurchaseOrder = {
  id: number;
  supplier: string;
  ordered_at: string;
  expected_at: string | null;
  received_at: string | null;
  status: "open" | "partial" | "received" | "cancelled";
  total_cents: number;
  notes: string | null;
};

export type Expense = {
  id: number;
  occurred_at: string;
  category: string;
  amount_cents: number;
  vendor: string | null;
  notes: string | null;
};

export type Campaign = {
  id: number;
  name: string;
  channel: "email" | "sms" | "both";
  audience: string;
  audience_filter: string | null;
  subject: string | null;
  body: string;
  trigger_type: "manual" | "scheduled" | "birthday" | "anniversary" | "holiday" | "event";
  trigger_config: string | null;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  scheduled_for: string | null;
  sent_at: string | null;
  stats: string | null;
  created_at: string;
};

export type Integration = {
  id: number;
  provider: "clover" | "twilio" | "resend";
  status: "connected" | "disconnected" | "error";
  config: string | null;
  last_sync_at: string | null;
  last_sync_summary: string | null;
};

export type SocialPost = {
  id: number;
  caption: string;
  hashtags: string | null;
  media_urls: string | null;
  platforms: string;
  status: "draft" | "scheduled" | "posted" | "failed";
  scheduled_for: string | null;
  posted_at: string | null;
  results: string | null;
  campaign: string | null;
  created_by: string;
  created_at: string;
};
