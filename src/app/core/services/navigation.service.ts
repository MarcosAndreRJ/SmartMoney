import { Injectable, signal } from '@angular/core';

export type AppView = 'dashboard' | 'accounts' | 'statement' | 'categories' | 'subcategories' | 'subcategory-form' |
    'profile' | 'goals' | 'goal-contributions' | 'contacts' | 'notifications' | 'shared-accounts' |
    'recurring' | 'budgets' | 'savings' | 'investments' | 'settings' | 'transactions' | 'all-transfers' | 'lancamentos' | 'loans' | 'data-management' | 'credit-cards' | 'subscription' |
    'admin' | 'admin-dashboard' | 'admin-users' | 'admin-plans' | 'admin-subscriptions' | 'admin-transactions' | 'admin-notifications';

@Injectable({
    providedIn: 'root'
})
export class NavigationService {
    currentView = signal<AppView>('dashboard');
    selectedCategoryId = signal<string | null>(null);
    selectedSubcategoryId = signal<string | null>(null);
    selectedAccountForStatement = signal<any>(null);

    navigateTo(view: AppView, params?: { categoryId?: string, subcategoryId?: string, account?: any }) {
        console.log(`NavigationService: Navigating to ${view}`, params);

        if (params?.categoryId) {
            this.selectedCategoryId.set(params.categoryId);
        } else if (view !== 'subcategories' && view !== 'subcategory-form') {
            this.selectedCategoryId.set(null);
        }

        if (params?.subcategoryId) {
            this.selectedSubcategoryId.set(params.subcategoryId);
        } else {
            this.selectedSubcategoryId.set(null);
        }

        if (params?.account) {
            this.selectedAccountForStatement.set(params.account);
        }

        this.currentView.set(view);
    }
}
