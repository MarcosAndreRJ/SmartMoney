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
import { Session } from '@supabase/supabase-js';
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
import { SubscriptionCheckoutComponent } from './features/subscription/subscription-checkout.component';
import { SubscriptionStatusComponent } from './features/subscription/subscription-status.component';

import { AdminLayoutComponent } from './features/admin/admin-layout.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard/admin-dashboard.component';
import { AdminUsersComponent } from './features/admin/admin-users/admin-users-list.component';
import { AdminPlansComponent } from './features/admin/admin-plans/admin-plans.component';
import { AdminSubscriptionsComponent } from './features/admin/admin-subscriptions/admin-subscriptions.component';
import { AdminTransactionsComponent } from './features/admin/admin-transactions/admin-transactions.component';
import { AdminNotificationsComponent } from './features/admin/admin-notifications/admin-notifications.component';
import { TransactionFormComponent } from './features/transactions/transaction-form.component';
import { TransactionViewService } from './core/services/transaction-view.service';
import { PageContextService } from './core/services/page-context.service';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [
    SidebarComponent, HeaderComponent,
    AccountFormComponent, AuthComponent,
    ToastComponent, LoadingOverlayComponent,
    TransactionFormComponent, RouterOutlet
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

      @if (txViewSrv.isOpen()) {
        <app-transaction-form
          (formClose)="txViewSrv.close()"
          (formSave)="onTransactionSaved()">
        </app-transaction-form>
      }
      
      <div class="flex min-h-screen bg-[#F8F9FA]" [class.hidden]="showAccountForm()">
        <app-sidebar></app-sidebar>
        <div class="flex-1 ml-64 flex flex-col">
          <app-header (viewChange)="handleViewChange($event)"></app-header>
          <main class="flex-1 overflow-y-auto">
            <router-outlet></router-outlet>
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
  public txViewSrv = inject(TransactionViewService);
  private pageContextSrv = inject(PageContextService);
  private router = inject(Router);

  @ViewChild('accountsList') accountsList?: AccountsListComponent;

  showAccountForm = signal(false);
  currentView = this.navSrv.currentView;
  selectedAccountForStatement = this.navSrv.selectedAccountForStatement;
  selectedCategoryId = this.navSrv.selectedCategoryId;
  session = signal<Session | null>(null);
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
    this.router.navigate([view]);
  }

  onNavigate(viewId: any, event: Event) {
    event.preventDefault();
    this.router.navigate([viewId]);
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

  onTransactionSaved() {
    this.txViewSrv.close();
  }
}
