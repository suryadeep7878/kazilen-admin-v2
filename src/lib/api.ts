const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

const TOKEN_KEY = "kazilen_admin_token";

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    clearAdminToken();
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch {
      /* keep default message */
    }
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

export interface AdminLoginResponse {
  status: string;
  access_token: string;
  token_type: string;
  email: string;
}

export interface AdminProfile {
  email: string;
  role: string;
}

export interface AdminStats {
  total_users: number;
  total_customers: number;
  total_workers: number;
  workers_online: number;
  total_bookings: number;
  bookings_pending: number;
  bookings_completed: number;
  total_reviews: number;
  total_feedback: number;
  total_categories: number;
  total_sub_categories: number;
  total_referrals: number;
  total_membership_plans: number;
}

export interface AdminCategory {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  is_active: boolean;
  sort_order: number;
  sub_categories_count: number;
}

export interface AdminSubCategory {
  id: string;
  category_id: string;
  label: string;
  description: string | null;
  image: string | null;
  tag: string | null;
  price_type: string;
  fixed_price: number | null;
  price_per_hour: number | null;
  is_active: boolean;
  sort_order: number;
}

export interface AdminReview {
  id: number;
  booking_id: number;
  service_id: string;
  reviewer_id: number;
  reviewer_name: string | null;
  reviewee_id: number;
  reviewee_name: string | null;
  rating: number;
  description: string;
  created_at: string | null;
}

export interface AdminFeedback {
  id: number;
  booking_id: number | null;
  user_id: number;
  user_name: string | null;
  rating: number;
  description: string;
  created_at: string | null;
}

export interface ReferralLeader {
  id: number;
  full_name: string | null;
  phone_number: string;
  role: string;
  referral_code: string | null;
  referral_points: number;
}

export interface ReferralClaim {
  id: number;
  referrer_id: number;
  referrer_name: string | null;
  referred_user_id: number;
  referred_name: string | null;
  referral_code: string;
  created_at: string | null;
}

export interface MembershipPlan {
  id: number;
  name: string;
  price: number;
  duration_days: number;
  bookings_included: number | null;
  description: string | null;
  features: string[];
  is_active: boolean;
  subscribers_count: number;
}

export interface MembershipSubscription {
  id: number;
  worker_id: number;
  worker_name: string | null;
  plan_id: number;
  plan_name: string | null;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string | null;
}

export interface WorkerQuota {
  subscribed: boolean;
  subscription: MembershipSubscription | null;
  plan_name: string | null;
  free_limit: number;
  free_used: number;
  free_remaining: number;
  plan_limit: number | null;
  plan_used: number;
  plan_remaining: number | null;
  total_used: number;
  total_limit: number | null;
  total_remaining: number | null;
  quota_exhausted: boolean;
}

export interface AdminUser {
  id: number;
  phone_number: string;
  full_name: string | null;
  role: string;
  is_online: number;
  verification_status: string;
  profile_photo: string | null;
  referral_code: string | null;
  referral_points: number;
  created_at: string | null;
}

export interface AdminBooking {
  id: number;
  customer_id: number;
  worker_id: number;
  service_id: string;
  date: string;
  time_slot: string;
  status: string;
  amount: string | null;
  created_at: string | null;
}
