import { Routes } from '@angular/router';
import { PageId } from './core/models/page-id.enum';

// Importação dos componentes para as rotas
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { AccountsListComponent } from './features/accounts/accounts-list.component';
import { AccountStatementComponent } from './features/accounts/account-statement.component';
import { CategoriesPageComponent } from './features/categories/categories-page.component';
import { SubcategoriesPageComponent } from './features/categories/subcategories-page.component';
import { SubcategoryFormComponent } from './features/categories/subcategory-form.component';
import { ProfileComponent } from './features/profile/profile.component';
import { GoalsComponent } from './features/goals/goals.component';
import { GoalContributionsPageComponent } from './features/goals/goal-contributions-page.component';
import { ContactsComponent } from './features/contacts/contacts.component';
import { NotificationsComponent } from './features/notifications/notifications.component';
import { SharedAccountsComponent } from './features/shared-accounts/shared-accounts.component';
import { RecurringTransactionsComponent } from './features/transactions/recurring-transactions.component';
import { InvestmentsComponent } from './features/investments/investments.component';
import { TransactionsPageComponent } from './features/transactions/transactions-page.component';
import { LoansPageComponent } from './features/loans/loans-page.component';
import { CreditCardsPageComponent } from './features/credit-cards/credit-cards-page.component';
import { DataManagementComponent } from './features/data-management/data-management.component';
import { SubscriptionPageComponent } from './features/subscription/subscription-page.component';
import { TransfersComponent } from './features/transactions/transfers.component';
import { AllTransfersComponent } from './features/transactions/all-transfers.component';

// Admin components
import { AdminDashboardComponent } from './features/admin/admin-dashboard/admin-dashboard.component';
import { AdminUsersComponent } from './features/admin/admin-users/admin-users-list.component';
import { AdminPlansComponent } from './features/admin/admin-plans/admin-plans.component';
import { AdminSubscriptionsComponent } from './features/admin/admin-subscriptions/admin-subscriptions.component';
import { AdminTransactionsComponent } from './features/admin/admin-transactions/admin-transactions.component';
import { AdminNotificationsComponent } from './features/admin/admin-notifications/admin-notifications.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    component: DashboardComponent,
    data: { title: 'Painel', pageId: PageId.DASHBOARD }
  },
  {
    path: 'accounts',
    component: AccountsListComponent,
    data: { title: 'Minhas Contas', pageId: PageId.ACCOUNTS }
  },
  {
    path: 'statement',
    component: AccountStatementComponent,
    data: { title: 'Extrato Detalhado', pageId: PageId.STATEMENT }
  },
  {
    path: 'categories',
    component: CategoriesPageComponent,
    data: { title: 'Categorias de Gastos', pageId: PageId.CATEGORIES }
  },
  {
    path: 'subcategories',
    component: SubcategoriesPageComponent,
    data: { title: 'Subcategorias', pageId: PageId.SUBCATEGORIES }
  },
  {
    path: 'subcategory-form',
    component: SubcategoryFormComponent,
    data: { title: 'Nova Subcategoria', pageId: PageId.SUBCATEGORY_FORM }
  },
  {
    path: 'profile',
    component: ProfileComponent,
    data: { title: 'Meu Perfil', pageId: PageId.PROFILE }
  },
  {
    path: 'goals',
    component: GoalsComponent,
    data: { title: 'Metas e Sonhos', pageId: PageId.GOALS }
  },
  {
    path: 'goal-contributions',
    component: GoalContributionsPageComponent,
    data: { title: 'Aportes em Metas', pageId: PageId.GOAL_CONTRIBUTIONS }
  },
  {
    path: 'contacts',
    component: ContactsComponent,
    data: { title: 'Contatos e Favorecidos', pageId: PageId.CONTACTS }
  },
  {
    path: 'notifications',
    component: NotificationsComponent,
    data: { title: 'Notificações', pageId: PageId.NOTIFICATIONS }
  },
  {
    path: 'shared-accounts',
    component: SharedAccountsComponent,
    data: { title: 'Contas Compartilhadas', pageId: PageId.SHARED_ACCOUNTS }
  },
  {
    path: 'recurring',
    component: RecurringTransactionsComponent,
    data: { title: 'Lançamentos Automáticos', pageId: PageId.RECURRING }
  },
  {
    path: 'investments',
    component: InvestmentsComponent,
    data: { title: 'Portfólio de Investimentos', pageId: PageId.INVESTMENTS }
  },
  {
    path: 'loans',
    component: LoansPageComponent,
    data: { title: 'Empréstimos', pageId: PageId.LOANS }
  },
  {
    path: 'credit-cards',
    component: CreditCardsPageComponent,
    data: { title: 'Cartões de Crédito', pageId: PageId.CREDIT_CARDS }
  },
  {
    path: 'data-management',
    component: DataManagementComponent,
    data: { title: 'Gerenciar Dados', pageId: PageId.DATA_MANAGEMENT }
  },
  {
    path: 'subscription',
    component: SubscriptionPageComponent,
    data: { title: 'Minha Assinatura', pageId: PageId.SUBSCRIPTION }
  },
  {
    path: 'transactions',
    component: TransfersComponent,
    data: { title: 'Transferências', pageId: PageId.TRANSACTIONS }
  },
  {
    path: 'all-transfers',
    component: AllTransfersComponent,
    data: { title: 'Todas as Transferências', pageId: PageId.ALL_TRANSFERS }
  },
  {
    path: 'lancamentos',
    component: TransactionsPageComponent,
    data: { title: 'Lançamentos Mensais', pageId: PageId.LANCAMENTOS }
  },

  // Admin routes
  {
    path: 'admin-dashboard',
    component: AdminDashboardComponent,
    data: { title: 'Painel Administrativo', pageId: PageId.ADMIN_DASHBOARD }
  },
  {
    path: 'admin-users',
    component: AdminUsersComponent,
    data: { title: 'Gestão de Usuários', pageId: PageId.ADMIN_USERS }
  },
  {
    path: 'admin-plans',
    component: AdminPlansComponent,
    data: { title: 'Gestão de Planos', pageId: PageId.ADMIN_PLANS }
  },
  {
    path: 'admin-subscriptions',
    component: AdminSubscriptionsComponent,
    data: { title: 'Gestão de Assinaturas', pageId: PageId.ADMIN_SUBSCRIPTIONS }
  },
  {
    path: 'admin-transactions',
    component: AdminTransactionsComponent,
    data: { title: 'Busca de Transações', pageId: PageId.ADMIN_TRANSACTIONS }
  },
  {
    path: 'admin-notifications',
    component: AdminNotificationsComponent,
    data: { title: 'Envio de Notificações', pageId: PageId.ADMIN_NOTIFICATIONS }
  },

  // Fallback
  { path: '**', redirectTo: 'dashboard' }
];
