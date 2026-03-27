import { ChangeDetectionStrategy, Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { SidebarComponent } from './layout/sidebar.component';
import { HeaderComponent } from './layout/header.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { AccountFormComponent } from './features/accounts/account-form.component';
import { AccountsListComponent } from './features/accounts/accounts-list.component';
import { AccountStatementComponent } from './features/accounts/account-statement.component';
import { Account } from './features/accounts/account-details-modal.component';
import { AllTransfersComponent } from './features/transactions/all-transfers.component';
import { TransfersComponent } from './features/transactions/transfers.component';
import { ProfileComponent } from './features/profile/profile.component';
import { GoalsComponent } from './features/goals/goals.component';
import { ContactsComponent } from './features/contacts/contacts.component';
import { NotificationsComponent } from './features/notifications/notifications.component';
import { SharedAccountsComponent } from './features/shared-accounts/shared-accounts.component';
import { RecurringTransactionsComponent } from './features/transactions/recurring-transactions.component';
import { InvestmentsComponent } from './features/investments/investments.component';
import { TransactionsPageComponent } from './features/transactions/transactions-page.component';
import { LoansPageComponent } from './features/loans/loans-page.component';
import { AuthComponent } from './features/auth/auth.component';
import { CreditCardsPageComponent } from './features/credit-cards/credit-cards-page.component';
import { SupabaseService } from './core/services/supabase.service';
import { ToastComponent } from './shared/components/toast.component';
import { LoadingOverlayComponent } from './shared/components/loading-overlay.component';
import { LoadingService } from './core/services/loading.service';
import { NavigationService } from './core/services/navigation.service';
import { AdminService } from './core/services/admin.service';

import { CategoriesPageComponent } from './features/categories/categories-page.component';
import { SubcategoriesPageComponent } from './features/categories/subcategories-page.component';
import { SubcategoryFormComponent } from './features/categories/subcategory-form.component';
import { GoalContributionsPageComponent } from './features/goals/goal-contributions-page.component';
import { DataManagementComponent } from './features/data-management/data-management.component';
import { RecurringSchedulerService } from './core/services/recurring-scheduler.service';
import { SubscriptionPageComponent } from './features/subscription/subscription-page.component';

import { AdminLayoutComponent } from './features/admin/admin-layout.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard/admin-dashboard.component';
import { AdminUsersComponent } from './features/admin/admin-users/admin-users-list.component';
import { AdminPlansComponent } from './features/admin/admin-plans/admin-plans.component';
import { AdminSubscriptionsComponent } from './features/admin/admin-subscriptions/admin-subscriptions.component';
import { AdminTransactionsComponent } from './features/admin/admin-transactions/admin-transactions.component';
import { AdminNotificationsComponent } from './features/admin/admin-notifications/admin-notifications.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [
    SidebarComponent, HeaderComponent, DashboardComponent,
    AccountFormComponent, AccountsListComponent, AccountStatementComponent,
    CategoriesPageComponent, SubcategoriesPageComponent, SubcategoryFormComponent,
    AllTransfersComponent, TransfersComponent, ProfileComponent, GoalsComponent,
    ContactsComponent, NotificationsComponent, SharedAccountsComponent,
    RecurringTransactionsComponent, InvestmentsComponent, TransactionsPageComponent, LoansPageComponent, AuthComponent,
    ToastComponent, LoadingOverlayComponent, GoalContributionsPageComponent, DataManagementComponent,
    CreditCardsPageComponent, SubscriptionPageComponent,
    AdminLayoutComponent, AdminDashboardComponent, AdminUsersComponent, AdminPlansComponent,
    AdminSubscriptionsComponent, AdminTransactionsComponent, AdminNotificationsComponent
  ],
  template: `
    <app-toast></app-toast>
    <app-loading-overlay [isLoading]="loadingSrv.isLoading()" [message]="loadingSrv.message()"></app-loading-overlay>
    
    @if (!session()) {
      <app-auth></app-auth>
    } @else {
      @if (showAccountForm()) {
        <app-account-form 
          (closeForm)="showAccountForm.set(false)"
          (accountCreated)="onAccountCreated()">
        </app-account-form>
      }
      
      <div class="flex min-h-screen bg-[#F8F9FA]" [class.hidden]="showAccountForm()">
        <app-sidebar></app-sidebar>
        <div class="flex-1 ml-64 flex flex-col">
          <app-header (viewChange)="handleViewChange($event)"></app-header>
          <main class="flex-1 overflow-y-auto">
            @if (currentView() === 'dashboard') {
              <app-dashboard></app-dashboard>
            } @else if (currentView() === 'accounts') {
              <app-accounts-list 
                #accountsList
                (addAccount)="showAccountForm.set(true)"
                (viewStatement)="openStatement($event)">
              </app-accounts-list>
            } @else if (currentView() === 'statement') {
              <app-account-statement 
                [account]="selectedAccountForStatement()!"
                (back)="handleViewChange('accounts')">
              </app-account-statement>
            } @else if (currentView() === 'categories') {
              <app-categories-page (changeView)="handleExtViewChange($event)"></app-categories-page>
            } @else if (currentView() === 'subcategories') {
              <app-subcategories-page [initialParentId]="selectedCategoryId()"></app-subcategories-page>
            } @else if (currentView() === 'subcategory-form') {
              <app-subcategory-form></app-subcategory-form>
            } @else if (currentView() === 'profile') {
              <app-profile></app-profile>
            } @else if (currentView() === 'goals') {
              <app-goals></app-goals>
            } @else if (currentView() === 'goal-contributions') {
              <app-goal-contributions-page></app-goal-contributions-page>
            } @else if (currentView() === 'contacts') {
              <app-contacts></app-contacts>
            } @else if (currentView() === 'notifications') {
              <app-notifications></app-notifications>
            } @else if (currentView() === 'shared-accounts') {
              <app-shared-accounts></app-shared-accounts>
            } @else if (currentView() === 'recurring') {
              <app-recurring-transactions></app-recurring-transactions>
            } @else if (currentView() === 'budgets') {
              <div class="p-8 flex items-center justify-center h-full text-gray-400">
                Budgets view is coming soon...
              </div>
            } @else if (currentView() === 'savings') {
              <div class="p-8 flex items-center justify-center h-full text-gray-400">
                Savings view is coming soon...
              </div>
            } @else if (currentView() === 'investments') {
              <app-investments></app-investments>
            } @else if (currentView() === 'loans') {
              <app-loans-page></app-loans-page>
            } @else if (currentView() === 'credit-cards') {
              <app-credit-cards-page></app-credit-cards-page>
            } @else if (currentView() === 'data-management') {
              <app-data-management></app-data-management>
            } @else if (currentView() === 'subscription') {
              <app-subscription-page></app-subscription-page>
            } @else if (currentView() === 'settings') {
              <div class="p-8 flex items-center justify-center h-full text-gray-400">
                Settings view is coming soon...
              </div>
            } @else if (currentView() === 'transactions') {
              <app-transfers 
                (seeAll)="handleViewChange('all-transfers')"
                (changeView)="handleViewChange($event)">
              </app-transfers>
            } @else if (currentView() === 'lancamentos') {
              <app-transactions-page></app-transactions-page>
            } @else if (currentView() === 'all-transfers') {
              <app-all-transfers (back)="handleViewChange('transactions')"></app-all-transfers>
            } @else if (currentView() === 'admin-dashboard') {
              <app-admin-dashboard></app-admin-dashboard>
            } @else if (currentView() === 'admin-users') {
              <app-admin-users></app-admin-users>
            } @else if (currentView() === 'admin-plans') {
              <app-admin-plans></app-admin-plans>
            } @else if (currentView() === 'admin-subscriptions') {
              <app-admin-subscriptions></app-admin-subscriptions>
            } @else if (currentView() === 'admin-transactions') {
              <app-admin-transactions></app-admin-transactions>
            } @else if (currentView() === 'admin-notifications') {
              <app-admin-notifications></app-admin-notifications>
            } @else if (currentView() === 'admin') {
              <app-admin-dashboard></app-admin-dashboard>
            } @else {
              <div class="p-8 flex items-center justify-center h-full text-gray-400">
                Em desenvolvimento...
              </div>
            }
          </main>
        </div>
      </div>
    }
  `,
  styles: []
})
export class App implements OnInit {
  private supabase = inject(SupabaseService);
  public loadingSrv = inject(LoadingService);
  private navSrv = inject(NavigationService);
  private recurringScheduler = inject(RecurringSchedulerService);
  private adminService = inject(AdminService);

  @ViewChild('accountsList') accountsList?: AccountsListComponent;

  showAccountForm = signal(false);
  currentView = this.navSrv.currentView;
  selectedAccountForStatement = this.navSrv.selectedAccountForStatement;
  selectedCategoryId = this.navSrv.selectedCategoryId;
  session = signal<unknown>(null);
  isAdmin = signal(false);

  async ngOnInit() {
    const { data: { session } } = await this.supabase.client.auth.getSession();
    this.session.set(session);

    if (session) {
      this.isAdmin.set(await this.adminService.isAdmin());
      this.recurringScheduler.runIfEnabled();
    }

    this.supabase.client.auth.onAuthStateChange(async (_event, session) => {
      this.session.set(session);
      if (session) {
        this.isAdmin.set(await this.adminService.isAdmin());
        this.recurringScheduler.runIfEnabled();
      }
    });
  }

  handleViewChange(view: any) {
    this.loadingSrv.show();
    this.navSrv.navigateTo(view as any);

    setTimeout(() => {
      this.loadingSrv.hide();
    }, 400);
  }

  handleExtViewChange(event: { view: any, parentId?: string }) {
    this.navSrv.navigateTo(event.view as any, { categoryId: event.parentId });
  }

  openStatement(account: Account) {
    this.selectedAccountForStatement.set(account);
    this.currentView.set('statement');
  }

  onAccountCreated() {
    this.showAccountForm.set(false);
    if (this.currentView() === 'accounts' && this.accountsList) {
      this.accountsList.loadAccounts();
    }
  }
}
