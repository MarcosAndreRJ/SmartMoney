export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  parent_id?: string | null;
  icon: string;
  color: string;
  budget_monthly?: number | null;
  created_at?: string;
}

export interface CategoryWithStats extends Category {
  subcategories_count: number;
  monthly_spending: number;
}
