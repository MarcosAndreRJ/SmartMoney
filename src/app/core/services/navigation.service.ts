import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Account } from '../models/account.model';

export type AppView = 'dashboard' | 'accounts' | 'statement' | 'categories' | 'subcategories' | 'subcategory-form' |
    'profile' | 'goals' | 'goal-contributions' | 'contacts' | 'notifications' | 'shared-accounts' |
    'recurring' | 'budgets' | 'savings' | 'investments' | 'settings' | 'transactions' | 'all-transfers' | 'lancamentos' | 'loans' | 'data-management' | 'credit-cards' | 'subscription' |
    'subscription-checkout' | 'subscription-status' |
    'admin' | 'admin-dashboard' | 'admin-users' | 'admin-plans' | 'admin-subscriptions' | 'admin-transactions' | 'admin-notifications';

export interface SubscriptionStatusContext {
    action: 'cancel' | 'resume';
    status: 'success' | 'error';
    title: string;
    message: string;
    planName?: string;
    endDate?: string;
}

@Injectable({
    providedIn: 'root'
})
export class NavigationService {
    private router = inject(Router);
    currentView = signal<AppView>('dashboard');
    selectedCategoryId = signal<string | null>(null);
    selectedSubcategoryId = signal<string | null>(null);
    selectedAccountForStatement = signal<Account | null>(null);
    selectedPlanId = signal<string | null>(null);
    subscriptionStatusContext = signal<SubscriptionStatusContext | null>(null);

    constructor() {
        // Sync currentView signal with router URL
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(event => {
            const url = (event as NavigationEnd).urlAfterRedirects;
            // Get the last segment as the view name, or fallback to dashboard
            const segments = url.split('/').filter(s => !!s);
            const view = (segments.length > 0 ? segments[segments.length - 1] : 'dashboard') as AppView;
            
            if (view) {
                this.currentView.set(view);
            }
        });
    }

    navigateTo(view: AppView, params?: { categoryId?: string, subcategoryId?: string, account?: Account }) {
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

        // Use standard Angular Router
        this.router.navigate([view]);
    }
}
