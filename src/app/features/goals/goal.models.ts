export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  deadline: string;
  frequency: 'mensal' | 'semanal' | 'quinzenal' | 'unico';
  icon: string;
  color: string;
  status: 'active' | 'completed' | 'suspended';
  created_at?: string;
  updated_at?: string;
  // Computed fields (not in DB natively or aggregated)
  current_amount?: number; 
}

export interface GoalContribution {
  id: string;
  user_id: string;
  goal_id: string;
  account_id: string | null;
  amount: number;
  date: string;
  category: string;
  message: string | null;
  created_at?: string;
  goals?: { name: string; icon: string; color: string }; // Joined from supabase
}
