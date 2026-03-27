import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrivacyService } from '../../core/services/privacy.service';
import { InvestmentService, Investment } from './investments.service';
import { InvestmentFormComponent } from './investment-form.component';
import { InvestmentContributionComponent } from './investment-contribution.component';
import { DeleteConfirmModalComponent } from '../../shared/components/delete-confirm-modal.component';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [MatIconModule, CommonModule, FormsModule, InvestmentFormComponent, InvestmentContributionComponent, DeleteConfirmModalComponent],
  template: `
    <div class="p-8 max-w-7xl mx-auto space-y-10 pb-20">
      
      <!-- Header -->
      <div class="flex justify-between items-start mb-10">
        <div>
          <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight">Investimentos</h2>
          <p class="text-slate-500 mt-1.5 font-medium">Visão geral em tempo real da sua carteira financeira.</p>
        </div>
        <div class="flex items-center gap-4">
          <button class="bg-white border border-gray-200 text-slate-700 rounded-xl py-2.5 px-4 flex items-center gap-2 font-bold text-sm hover:bg-slate-50 transition-all shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
            <mat-icon class="text-[18px]">download</mat-icon>
            Exportar Relatório
          </button>
          <!-- Using same standard Add form for direct aportes or specific modal logic could be here -->
          <button class="bg-[#0F172A] text-white rounded-xl py-2.5 px-4 flex items-center gap-2 font-bold text-sm hover:bg-slate-800 transition-all shadow-[0_2px_10px_rgba(15,23,42,0.3)]" (click)="openNewInvestment()">
            <mat-icon class="text-[18px]">add</mat-icon>
            Novo Ativo
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Total Investido -->
        <div class="bg-white/80 backdrop-blur-xl rounded-[24px] p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-white/40 relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300">
          <div class="flex justify-between items-start">
            <p class="text-[13px] text-slate-500 font-bold tracking-wide uppercase">Total Investido</p>
            <div class="p-2 bg-slate-50 rounded-xl group-hover:bg-slate-100 transition-colors">
              <mat-icon class="text-slate-400">account_balance</mat-icon>
            </div>
          </div>
          <h2 class="text-4xl font-extrabold text-slate-900 mt-4 tracking-tight">
            {{ privacy.isPrivate() ? 'R$ ****' : (investmentService.totalInvested() | currency:'BRL':'symbol':'1.2-2') }}
          </h2>
          <p class="text-xs text-emerald-600 mt-3 font-bold flex items-center gap-1.5">
            <mat-icon class="text-[16px]">trending_up</mat-icon>
            +0,5% vs mês anterior
            <img src="assets/images/sparkline-up.svg" class="w-16 h-6 ml-auto opacity-70" alt="trend" onerror="this.style.display='none'">
          </p>
        </div>

        <!-- Retorno Mensal -->
        <div class="bg-white/80 backdrop-blur-xl rounded-[24px] p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-white/40 relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300">
          <div class="flex justify-between items-start">
            <p class="text-[13px] text-slate-500 font-bold tracking-wide uppercase">Retorno Mensal</p>
            <div class="p-2 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
              <mat-icon class="text-emerald-500">calendar_today</mat-icon>
            </div>
          </div>
          <h2 class="text-4xl font-extrabold text-slate-900 mt-4 tracking-tight">
            {{ privacy.isPrivate() ? 'R$ ****' : '+' + (investmentService.monthlyReturn() | currency:'BRL':'symbol':'1.2-2') }}
          </h2>
          <p class="text-xs text-emerald-600 mt-3 font-bold flex items-center gap-1.5">
            <mat-icon class="text-[16px]">arrow_upward</mat-icon>
            +{{ investmentService.monthlyReturnPercent() | number:'1.1-1' }}% de yield
          </p>
        </div>

        <!-- Lucro/Prejuízo Total -->
        <div class="bg-white/80 backdrop-blur-xl rounded-[24px] p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-white/40 relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300">
          <div class="flex justify-between items-start">
            <p class="text-[13px] text-slate-500 font-bold tracking-wide uppercase">Lucro/Prejuízo Total</p>
            <div class="p-2 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
              <mat-icon class="text-blue-500">show_chart</mat-icon>
            </div>
          </div>
          <h2 class="text-4xl font-extrabold text-slate-900 mt-4 tracking-tight" [ngClass]="investmentService.totalProfitLoss() >= 0 ? 'text-emerald-600' : 'text-red-600'">
            {{ privacy.isPrivate() ? 'R$ ****' : (investmentService.totalProfitLoss() >= 0 ? '+' : '') + (investmentService.totalProfitLoss() | currency:'BRL':'symbol':'1.2-2') }}
          </h2>
          <p class="text-xs mt-3 font-bold flex items-center gap-1.5" [ngClass]="investmentService.totalProfitLossPercent() >= 0 ? 'text-emerald-600' : 'text-red-600'">
            <mat-icon class="text-[16px]">{{ investmentService.totalProfitLossPercent() >= 0 ? 'check_circle' : 'remove_circle' }}</mat-icon>
            {{ investmentService.totalProfitLossPercent() >= 0 ? '+' : '' }}{{ investmentService.totalProfitLossPercent() | number:'1.1-1' }}% retorno total
          </p>
        </div>
      </div>

      <!-- Charts Section (Mocked logic for layout) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Alocação de Ativos -->
        <div class="bg-white/80 backdrop-blur-xl rounded-[24px] p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-white/40">
          <h3 class="font-extrabold text-slate-900 text-lg mb-8">Alocação de Ativos</h3>
          
          <div class="flex flex-col items-center justify-center">
            <!-- Simulated Donut Chart -->
            <div class="relative w-48 h-48 mb-8">
              <svg viewBox="0 0 100 100" class="w-full h-full transform -rotate-90">
                <!-- Renda Fixa (20%) -->
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#94A3B8" stroke-width="12" stroke-dasharray="251.2" stroke-dashoffset="0"></circle>
                <!-- FIIs (25%) -->
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10B981" stroke-width="12" stroke-dasharray="251.2" stroke-dashoffset="62.8"></circle>
                <!-- Cripto (10%) -->
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#E2E8F0" stroke-width="12" stroke-dasharray="251.2" stroke-dashoffset="125.6"></circle>
                <!-- Ações (45%) -->
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#0F172A" stroke-width="12" stroke-dasharray="251.2" stroke-dashoffset="150.72"></circle>
              </svg>
              <!-- Center Text -->
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-3xl font-extrabold text-slate-900">100%</span>
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Carteira</span>
              </div>
            </div>

            <!-- Legend -->
            <div class="grid grid-cols-2 gap-x-8 gap-y-4 w-full px-4">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-[#0F172A]"></div>
                <span class="text-xs font-bold text-slate-600">Ações (45%)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span class="text-xs font-bold text-slate-600">FIIs (25%)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-slate-400"></div>
                <span class="text-xs font-bold text-slate-600">Renda Fixa (20%)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-slate-200"></div>
                <span class="text-xs font-bold text-slate-600">Cripto (10%)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Desempenho da Carteira -->
        <div class="bg-white/80 backdrop-blur-xl rounded-[24px] p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-white/40 flex flex-col">
          <div class="flex justify-between items-center mb-8">
            <h3 class="font-extrabold text-slate-900 text-lg">Desempenho da Carteira</h3>
            <div class="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 cursor-pointer">
                <span class="text-xs font-bold text-slate-600">Últimos 12 Meses</span>
                <mat-icon class="text-[14px] text-slate-400">expand_more</mat-icon>
            </div>
          </div>

          <!-- Simulated Bar Chart -->
          <div class="flex-1 flex items-end justify-between gap-2 mt-auto pt-8">
            @for (bar of [40, 45, 42, 55, 60, 58, 65, 70, 68, 80, 75, 95]; track $index; let last = $last) {
              <div class="w-full flex flex-col items-center gap-2 group cursor-pointer">
                <!-- Tooltip placeholder -->
                <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute -mt-10 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md whitespace-nowrap z-10 pointer-events-none">
                  R$ {{ privacy.isPrivate() ? '****' : (bar * 1000 | number:'1.0-0') }}
                </div>
                <!-- Bar -->
                <div class="w-full rounded-t-sm transition-all duration-300 group-hover:bg-indigo-500" 
                     [ngClass]="last ? 'bg-[#0F172A]' : 'bg-slate-200'"
                     [style.height.%]="bar"></div>
              </div>
            }
          </div>
          
          <!-- X Axis Labels -->
          <div class="flex justify-between mt-4 border-t border-gray-100 pt-3">
            <span class="text-[10px] font-bold text-slate-400">JAN</span>
            <span class="text-[10px] font-bold text-slate-400">FEV</span>
            <span class="text-[10px] font-bold text-slate-400">MAR</span>
            <span class="text-[10px] font-bold text-slate-400">ABR</span>
            <span class="text-[10px] font-bold text-slate-400">MAI</span>
            <span class="text-[10px] font-bold text-slate-400">JUN</span>
            <span class="text-[10px] font-bold text-slate-400">JUL</span>
            <span class="text-[10px] font-bold text-slate-400">AGO</span>
            <span class="text-[10px] font-bold text-slate-400">SET</span>
            <span class="text-[10px] font-bold text-slate-400">OUT</span>
            <span class="text-[10px] font-bold text-slate-400">NOV</span>
            <span class="text-[10px] font-bold text-slate-400">DEZ</span>
          </div>
        </div>
      </div>

      <!-- Investment List -->
      <div class="bg-white/80 backdrop-blur-xl rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-white/40 mt-6 relative z-10">
        <div class="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="flex items-center gap-4">
            <h3 class="font-extrabold text-slate-900 text-xl">Meus Ativos</h3>
            
            <!-- Tabs -->
            <div class="flex items-center bg-gray-100/80 p-1 rounded-xl">
              <button class="px-4 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm bg-white text-slate-900">
                Ativos
              </button>
              <button class="px-4 py-1.5 rounded-lg text-sm font-bold transition-all text-slate-500 hover:text-slate-700">
                Inativos
              </button>
            </div>
          </div>

          <!-- Filter & Action -->
          <div class="flex items-center gap-3 w-full md:w-auto">
            <div class="relative w-full md:w-64">
              <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</mat-icon>
              <input 
                type="text" 
                [(ngModel)]="searchQuery"
                placeholder="Filtrar..." 
                class="w-full bg-slate-50 border border-gray-100 rounded-xl py-2 pl-9 pr-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
              />
            </div>
            <button class="p-2 border border-gray-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors">
              <mat-icon class="text-lg leading-none">filter_list</mat-icon>
            </button>
          </div>
        </div>

        <div class="overflow-x-auto lg:overflow-visible">
          <table class="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr class="bg-slate-50/50">
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest rounded-tl-xl border-b border-gray-100">Nome do Ativo</th>
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-gray-100">Categoria</th>
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right border-b border-gray-100">Valor Investido</th>
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right border-b border-gray-100">Valor Atual</th>
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right border-b border-gray-100">Yield / Perf.</th>
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center rounded-tr-xl border-b border-gray-100 w-16">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50/80">
              @for (inv of filteredInvestments(); track inv.id) {
                <tr class="hover:bg-slate-50/80 transition-colors group">
                  <td class="px-6 py-5">
                    <div class="flex items-center gap-4">
                      <!-- Icon based on category -->
                      <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" [ngClass]="getCategoryBg(inv.category)">
                        <mat-icon class="text-[20px]" [ngClass]="getCategoryColor(inv.category)">{{ getCategoryIcon(inv.category) }}</mat-icon>
                      </div>
                      <span class="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{{ inv.name }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-5">
                     <span class="px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider uppercase" 
                           [ngClass]="getCategoryBadgeClass(inv.category)">
                       {{ inv.category }}
                     </span>
                  </td>
                  <td class="px-6 py-5 text-right font-bold text-slate-500">
                    {{ privacy.isPrivate() ? 'R$ ****' : (inv.initial_amount | currency:'BRL':'symbol':'1.2-2') }}
                  </td>
                  <td class="px-6 py-5 text-right font-extrabold text-slate-900">
                    {{ privacy.isPrivate() ? 'R$ ****' : (inv.current_amount | currency:'BRL':'symbol':'1.2-2') }}
                  </td>
                  <td class="px-6 py-5 text-right">
                    <span class="text-sm font-bold flex items-center justify-end gap-1" [ngClass]="(inv.changePercent || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'">
                      <mat-icon class="text-[14px]">{{ (inv.changePercent || 0) >= 0 ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                      {{ (inv.changePercent || 0) | number:'1.1-1' }}%
                    </span>
                  </td>
                  <td class="px-4 py-5 text-center relative">
                    <!-- Actions Menu -->
                     <button (click)="toggleMenu(inv.id)" class="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-all mx-auto focus:outline-none">
                        <mat-icon class="text-[20px]">more_horiz</mat-icon>
                     </button>
                     
                     <!-- Dropdown -->
                     @if(activeMenuId() === inv.id) {
                       <div class="absolute right-10 top-2 mt-1 w-48 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-gray-100 py-1 z-[60] animate-in fade-in zoom-in-95 duration-200 text-left">
                         <button (click)="openContribution(inv)" class="w-full px-4 py-2.5 text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center gap-2 text-left">
                           <mat-icon class="text-[18px]">add_circle</mat-icon>
                           Novo Aporte
                         </button>
                         <button (click)="openEditInvestment(inv)" class="w-full px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 text-left">
                           <mat-icon class="text-[18px] text-slate-400">edit</mat-icon>
                           Editar
                         </button>
                         <div class="h-px bg-gray-50 my-1"></div>
                         <button (click)="confirmDelete(inv)" class="w-full px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 text-left">
                           <mat-icon class="text-[18px] text-red-400">delete</mat-icon>
                           Excluir
                         </button>
                       </div>
                       <!-- Backdrop -->
                       <div class="fixed inset-0 z-[55]" (click)="closeMenu()"></div>
                     }
                  </td>
                </tr>
              }

              @if (filteredInvestments().length === 0) {
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-slate-500 font-medium text-sm">
                        Nenhum ativo encontrado.
                    </td>
                </tr>
              }
            </tbody>
          </table>
          <div class="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-slate-500 bg-slate-50/50 rounded-b-[24px]">
            <span>Exibindo {{ filteredInvestments().length }} de {{ investmentService.investments().length }} ativos ativos</span>
            <div class="flex gap-1">
                <button class="w-7 h-7 flex items-center justify-center rounded bg-white border border-gray-200 hover:bg-gray-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400"><mat-icon class="text-[14px]">chevron_left</mat-icon></button>
                <button class="w-7 h-7 flex items-center justify-center rounded bg-white border border-gray-200 hover:bg-gray-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400"><mat-icon class="text-[14px]">chevron_right</mat-icon></button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Modals injected dynamically based on state -->
      @if(isFormOpen()) {
         <app-investment-form 
           (close)="closeForm()"
         ></app-investment-form>
      }

      @if(isContributionOpen() && selectedInvestment()) {
         <!-- Inject manually to the component via inputs. Real component needs @Input. 
              Using dynamic component or ng-container in standard angular, 
              but since we mocked Outputs in child, we'll keep it simple: -->
         <app-investment-contribution 
           (close)="closeContribution()"
         ></app-investment-contribution>
      }

      @if(showDeleteModal()) {
        <app-delete-confirm-modal
          [title]="'Excluir Investimento'"
          [message]="'Tem certeza que deseja excluir este investimento? Esta ação não pode ser desfeita e os dados históricos serão removidos permanentemente.'"
          (confirm)="executeDelete()"
          (cancel)="closeDeleteModal()"
        ></app-delete-confirm-modal>
      }

    </div>
  `
})
export class InvestmentsComponent implements OnInit {
    privacy = inject(PrivacyService);
    investmentService = inject(InvestmentService);

    searchQuery = signal('');
    activeMenuId = signal<string | null>(null);

    // Modal states
    isFormOpen = signal(false);
    isContributionOpen = signal(false);
    showDeleteModal = signal(false);
    
    // Selection state
    selectedInvestment = signal<Investment | null>(null);


    async ngOnInit() {
        await this.investmentService.loadInvestments();
    }

    filteredInvestments = computed(() => {
        const query = this.searchQuery().toLowerCase();
        const list = this.investmentService.investments();
        if (!query) return list;
        return list.filter(inv => inv.name.toLowerCase().includes(query));
    });

    // Helper methods for category styling to match the High Fidelity design
    getCategoryIcon(category: string): string {
        switch (category) {
            case 'AÇÕES': return 'trending_up';
            case 'FIIS': return 'domain';
            case 'CRIPTO': return 'currency_bitcoin';
            case 'RENDA FIXA': return 'account_balance';
            default: return 'show_chart';
        }
    }

    getCategoryBg(category: string): string {
        switch (category) {
            case 'AÇÕES': return 'bg-blue-50';
            case 'FIIS': return 'bg-emerald-50';
            case 'CRIPTO': return 'bg-orange-50';
            case 'RENDA FIXA': return 'bg-slate-100';
            default: return 'bg-gray-50';
        }
    }

    getCategoryColor(category: string): string {
        switch (category) {
            case 'AÇÕES': return 'text-blue-600';
            case 'FIIS': return 'text-emerald-600';
            case 'CRIPTO': return 'text-orange-500';
            case 'RENDA FIXA': return 'text-slate-600';
            default: return 'text-gray-600';
        }
    }

    getCategoryBadgeClass(category: string): string {
        switch (category) {
            case 'AÇÕES': return 'bg-blue-100 text-blue-700';
            case 'FIIS': return 'bg-emerald-100 text-emerald-700';
            case 'CRIPTO': return 'bg-orange-100 text-orange-700';
            case 'RENDA FIXA': return 'bg-slate-200 text-slate-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    // Menu Actions
    toggleMenu(id: string) {
        this.activeMenuId.set(this.activeMenuId() === id ? null : id);
    }
    
    closeMenu() {
        this.activeMenuId.set(null);
    }

    // Modal Actions
    openNewInvestment() {
        this.selectedInvestment.set(null); // Clear selected for new
        this.isFormOpen.set(true);
    }

    openEditInvestment(inv: Investment) {
        this.selectedInvestment.set(inv);
        this.isFormOpen.set(true);
        this.closeMenu();
    }

    closeForm() {
        this.isFormOpen.set(false);
    }

    openContribution(inv: Investment) {
        this.selectedInvestment.set(inv);
        // We'll pass it to window object hack for this inline template simplicity without proper @Input injection setup
        (window as any).__currentInvestment = inv;
        this.isContributionOpen.set(true);
        this.closeMenu();
    }

    closeContribution() {
        this.isContributionOpen.set(false);
        (window as any).__currentInvestment = null;
    }

    confirmDelete(inv: Investment) {
        this.selectedInvestment.set(inv);
        this.showDeleteModal.set(true);
        this.closeMenu();
    }

    closeDeleteModal() {
        this.showDeleteModal.set(false);
        this.selectedInvestment.set(null);
    }

    async executeDelete() {
        const inv = this.selectedInvestment();
        if (inv) {
             await this.investmentService.deleteInvestment(inv.id);
             this.closeDeleteModal();
        }
    }
}
