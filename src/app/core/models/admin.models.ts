export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  avatar: string | null;
  birthDate?: string | null;
  role?: 'user' | 'admin';
  created_at?: string;
}

export interface Plan {
  id: string;
  slug?: 'basic' | 'pro' | 'family' | null;
  name: string;
  description?: string;
  price: number;
  features: string[];
  restrictions: {
    max_accounts: number | null;
    max_cards: number | null;
  };
  resources: {
    account_transfers: boolean;
    goals: boolean;
    loans: boolean;
    investments: boolean;
    whatsapp_entries: boolean;
    shared_accounts: boolean;
  };
  is_active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  user_email?: string;
  plan_id: string;
  plan_name?: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  start_date: string;
  end_date: string;
  payment_gateway: 'pagarme' | 'stripe' | 'manual';
  gateway_subscription_id?: string;
  created_at: string;
}

export interface AdminMetrics {
  total_users: number;
  active_users: number;
  new_users_today: number;
  total_transactions: number;
  total_balance: number;
  active_subscriptions: number;
  revenue_month: number;
  subscriptions_by_plan: { plan: string; count: number }[];
}

export interface SystemNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'email' | 'push' | 'in_app';
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  created_at: string;
}

export interface GlobalTransaction {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  account_id: string;
  account_name?: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: 'income' | 'expense' | 'transfer';
  status: 'confirmed' | 'pending' | 'cancelled';
  created_at: string;
}
