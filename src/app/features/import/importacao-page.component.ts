import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ImportacaoPreviewComponent } from './components/importacao-preview.component';
import { ImportParserService } from '../../core/services/import-parser.service';
import { ImportService } from '../../core/services/import.service';
import { FeatureAccessService } from '../../core/services/feature-access.service';
import { SupabaseService, SupabaseAccount } from '../../core/services/supabase.service';
import { ImportItem, ImportType } from '../../core/models/import.interface';

type Step = 'loading' | 'gated' | 'upload' | 'preview' | 'success' | 'error';

interface RecentImport {
  id: string;
  filename: string;
  date: Date;
  transactionsCount: number;
  status: 'completed' | 'pending' | 'error';
}

@Component({
  selector: 'app-importacao-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, ImportacaoPreviewComponent],
  template: `
    <div class="min-h-[calc(100vh-100px)] animate-in fade-in duration-700 bg-slate-50">
      <div class="max-w-[1400px] mx-auto p-8 lg:p-12">
        
        <!-- Breadcrumbs -->
        <div class="mb-6">
          <p class="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.2em]">Finanças <span class="mx-2 text-slate-300">/</span> Importação</p>
        </div>

        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div class="max-w-2xl">
            <h1 class="text-4xl font-black text-slate-900 tracking-tight mb-4">Importar Transações</h1>
            <p class="text-slate-500 font-medium leading-relaxed text-lg">
              Carregue seus arquivos financeiros para processamento inteligente. Nosso sistema arquitetado organiza automaticamente suas receitas e despesas.
            </p>
          </div>
          <button (click)="downloadTemplate()" class="flex items-center gap-3 px-6 py-4 bg-[#0F172A] text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95">
            <mat-icon class="text-xl">download</mat-icon>
            Baixar Modelo
          </button>
        </div>

        <!-- Main Content - Two Columns -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          <!-- Left Column (70%) -->
          <div class="lg:col-span-8 space-y-8">
            
            <!-- Stepper (only when not gated/loading) -->
            @if (currentStep() !== 'gated' && currentStep() !== 'loading') {
              <div class="flex items-center space-x-6 mb-4 bg-white/50 p-4 rounded-2xl w-fit border border-slate-100 shadow-sm">
                <div class="flex items-center space-x-3">
                  <div [class]="getStepClass('upload')" class="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black transition-all duration-300">1</div>
                  <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Upload</span>
                </div>
                <div class="w-8 h-px bg-slate-200"></div>
                <div class="flex items-center space-x-3">
                  <div [class]="getStepClass('preview')" class="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black transition-all duration-300">2</div>
                  <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Preview</span>
                </div>
                <div class="w-8 h-px bg-slate-200"></div>
                <div class="flex items-center space-x-3">
                  <div [class]="getStepClass('success')" class="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black transition-all duration-300">3</div>
                  <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Conclusão</span>
                </div>
              </div>
            }

            <!-- Gated Content -->
            @if (currentStep() === 'gated') {
              <div class="flex flex-col items-center justify-center space-y-8 text-center max-w-md mx-auto py-24 animate-in zoom-in duration-500">
                <div class="w-28 h-28 rounded-[2rem] bg-amber-500/10 flex items-center justify-center shadow-inner">
                  <mat-icon class="text-7xl text-amber-500 leading-none h-auto w-auto">lock</mat-icon>
                </div>
                <div class="space-y-4">
                  <h2 class="text-4xl font-black text-slate-900 tracking-tight">Recurso Master</h2>
                  <p class="text-slate-500 text-lg leading-relaxed">A importação via Excel é exclusiva para assinantes Master e Family. Organize suas finanças em massa com um único clique.</p>
                </div>
                <button class="w-full h-16 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-3xl shadow-2xl shadow-emerald-500/30 transition-all hover:-translate-y-1 active:scale-95 text-lg">
                  Fazer Upgrade Agora
                </button>
              </div>
            }

            <!-- Upload Step -->
            @if (currentStep() === 'upload') {
              <div class="animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                <!-- Dropzone -->
                <div 
                  class="relative group w-full h-80 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white transition-all duration-500 hover:border-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/5 cursor-pointer overflow-hidden p-12"
                  (dragover)="$event.preventDefault(); isDragOver.set(true)"
                  (dragleave)="isDragOver.set(false)"
                  (drop)="onDrop($event)"
                  (click)="fileInput.click()"
                >
                  <div class="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-transparent to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  
                  <div class="z-10 flex flex-col items-center space-y-6">
                    <div class="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm border border-emerald-500/10">
                      <mat-icon class="text-5xl text-emerald-500 leading-none h-auto w-auto">upload_file</mat-icon>
                    </div>
                    <div class="text-center space-y-2">
                      <p class="text-2xl font-black text-slate-900 tracking-tight">Arraste e solte seu arquivo aqui</p>
                      <p class="text-slate-400 font-medium">ou clique para navegar no seu computador</p>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/50">Planilhas do Excel</span>
                      <span class="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-full bg-blue-50 text-blue-600 border border-blue-100/50">Google Sheets (XLSX)</span>
                    </div>
                  </div>

                  <input 
                    #fileInput 
                    type="file" 
                    class="hidden" 
                    accept=".xlsx, .xls, .csv"
                    (change)="onFileSelected($event)"
                  >

                  @if (isDragOver()) {
                    <div class="absolute inset-0 bg-emerald-500/10 backdrop-blur-md flex items-center justify-center z-20 animate-in fade-in duration-300">
                      <div class="px-10 py-5 rounded-[2rem] bg-white shadow-2xl border border-emerald-500/20 translate-y-[-10px]">
                        <span class="text-emerald-500 font-black uppercase tracking-[0.2em] text-sm">Solte para importar</span>
                      </div>
                    </div>
                  }
                </div>

                <!-- Info Banner -->
                <div class="mt-8 p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100/50 backdrop-blur-sm shadow-sm">
                  <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0 shadow-sm">
                      <mat-icon class="text-blue-600 leading-none h-auto w-auto">info</mat-icon>
                    </div>
                    <div class="space-y-1">
                      <h4 class="text-base font-black text-slate-900">Formatos suportados e Limites</h4>
                      <p class="text-sm text-slate-500/80 leading-relaxed font-medium">
                        Sua privacidade é nossa prioridade absoluta. Todos os arquivos são processados com criptografia de ponta. Limite de tamanho: 15MB por arquivo. Formatos nativos: .xlsx, .xls e .csv.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Preview Step -->
            @if (currentStep() === 'preview') {
              <div class="bg-white rounded-[2.5rem] border border-slate-100 p-2 shadow-xl shadow-slate-200/50 animate-in fade-in zoom-in duration-700">
                <app-importacao-preview 
                  [items]="importItems()"
                  [accounts]="accounts()"
                  (confirm)="onConfirmImport($event)"
                  (cancel)="currentStep.set('upload')"
                />
              </div>
            }

            <!-- Success Step -->
            @if (currentStep() === 'success') {
              <div class="flex flex-col items-center justify-center space-y-10 text-center max-w-lg mx-auto py-24 animate-in zoom-in duration-700">
                <div class="w-32 h-32 rounded-[2.5rem] bg-emerald-500 text-slate-950 flex items-center justify-center shadow-3xl shadow-emerald-500/40 relative">
                  <div class="absolute inset-0 bg-white rounded-full animate-ping opacity-20"></div>
                  <mat-icon class="text-7xl leading-none h-auto w-auto relative z-10">check_circle</mat-icon>
                </div>
                <div class="space-y-4">
                  <h2 class="text-4xl font-black text-slate-900 tracking-tight">Importação de Sucesso!</h2>
                  <p class="text-slate-500 text-lg leading-relaxed font-medium">Processamos com inteligência <span class="text-emerald-600 font-black">{{ resultSummary().success }}</span> lançamentos. Seu ecossistema financeiro acaba de ser atualizado.</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <button (click)="reset()" class="h-16 bg-slate-100 text-slate-900 font-black rounded-3xl hover:bg-slate-200 transition-all active:scale-95 text-lg">
                    Nova Importação
                  </button>
                  <button class="h-16 bg-[#0F172A] text-white font-black rounded-3xl hover:bg-slate-800 transition-all shadow-xl active:scale-95 text-lg">
                    Dashboard Central
                  </button>
                </div>
              </div>
            }

            <!-- Recent Imports Section -->
            <div class="mt-12 pt-12 border-t border-slate-100">
              <div class="flex items-center justify-between mb-8">
                <h3 class="text-2xl font-black text-slate-900 tracking-tight">Atividade Recente</h3>
                <button class="text-[11px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100/50">Histórico Completo</button>
              </div>

              @if (recentImports().length === 0) {
                <div class="p-16 bg-white rounded-[2.5rem] border border-slate-100 text-center shadow-sm">
                  <div class="w-20 h-20 rounded-3xl bg-slate-50 mx-auto flex items-center justify-center mb-6">
                    <mat-icon class="text-5xl text-slate-200 leading-none h-auto w-auto">history</mat-icon>
                  </div>
                  <p class="text-lg text-slate-400 font-black tracking-tight mb-2">Sem atividade recente</p>
                  <p class="text-sm text-slate-300 font-medium max-w-sm mx-auto leading-relaxed">Você ainda não realizou importações. Seus arquivos arquivados aparecerão aqui após o processamento.</p>
                </div>
              } @else {
                <div class="space-y-4">
                  @for (imp of recentImports(); track imp.id) {
                    <div class="group flex items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500">
                      <div class="flex items-center gap-6">
                        <div class="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-emerald-100/50">
                          <mat-icon class="text-emerald-600 text-2xl h-auto w-auto leading-none">article</mat-icon>
                        </div>
                        <div>
                          <p class="text-lg font-black text-slate-900 tracking-tight group-hover:text-emerald-600 transition-colors">{{ imp.filename }}</p>
                          <div class="flex items-center gap-3 mt-1">
                            <span class="text-xs font-bold text-slate-300">{{ imp.date | date:'dd MMM yyyy' }}</span>
                            <span class="w-1 h-1 rounded-full bg-slate-200"></span>
                            <span class="text-xs font-bold text-slate-400">{{ imp.transactionsCount }} transações identificadas</span>
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center gap-4">
                         <div class="px-5 py-2.5 rounded-2xl bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                            <mat-icon class="text-sm h-auto w-auto leading-none font-black">verified</mat-icon>
                            <span class="text-[10px] font-black uppercase tracking-widest">Processado</span>
                         </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

          </div>

          <!-- Right Column (30%) -->
          <div class="lg:col-span-4 space-y-8">
            
            <!-- Instructions Card -->
            <div class="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
              <div class="absolute top-0 right-0 w-32 h-32 bg-slate-50/50 rounded-full translate-x-16 translate-y-[-16px] group-hover:scale-110 transition-transform duration-700"></div>
              
              <h3 class="text-xl font-black text-slate-900 mb-8 relative z-10 tracking-tight">Setup Inicial</h3>
              
              <div class="space-y-8 relative z-10">
                <div class="flex items-start gap-5 group/item">
                  <div class="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-[11px] font-black shrink-0 shadow-lg group-hover/item:scale-110 transition-transform">01</div>
                  <div class="space-y-1">
                    <h4 class="text-sm font-black text-slate-900 tracking-tight">Baixe o Mapa de Dados</h4>
                    <p class="text-xs text-slate-500/80 leading-relaxed font-medium">Use nossa estrutura pré-definida para arquitetar sua planilha.</p>
                  </div>
                </div>
                
                <div class="flex items-start gap-5 group/item border-t border-slate-50 pt-8">
                  <div class="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-[11px] font-black shrink-0 group-hover/item:bg-slate-900 group-hover/item:text-white transition-all">02</div>
                  <div class="space-y-1">
                    <h4 class="text-sm font-black text-slate-900 tracking-tight text-slate-400 group-hover/item:text-slate-900 transition-colors">Preencha as Variáveis</h4>
                    <p class="text-xs text-slate-400/80 leading-relaxed font-medium">Insira data, descrição e valor bruto em cada linha.</p>
                  </div>
                </div>
                
                <div class="flex items-start gap-5 group/item border-t border-slate-50 pt-8">
                  <div class="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-[11px] font-black shrink-0 group-hover/item:bg-slate-900 group-hover/item:text-white transition-all">03</div>
                  <div class="space-y-1">
                    <h4 class="text-sm font-black text-slate-900 tracking-tight text-slate-400 group-hover/item:text-slate-900 transition-colors">Inicie a Consolidação</h4>
                    <p class="text-xs text-slate-400/80 leading-relaxed font-medium">O algoritmo validará cada entrada em tempo real.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Architect Tip Card -->
            <div class="p-8 bg-[#0F172A] rounded-[2.5rem] text-white relative overflow-hidden min-h-[220px] flex flex-col justify-end group shadow-2xl shadow-slate-900/20">
              <div class="absolute inset-0 z-0 overflow-hidden">
                <img src="/assets/images/architect_tip.png" 
                     class="w-full h-full object-cover opacity-30 mix-blend-lighten group-hover:scale-110 transition-transform duration-1000"
                     alt="Architect Tip Illustration"
                     (error)="$event.target.style.display='none'">
                <div class="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/60 to-transparent"></div>
              </div>
              
              <h4 class="text-lg font-black mb-4 relative z-10 leading-snug tracking-tight">Sua análise financeira trimestral depende de dados precisos.</h4>
              <p class="text-sm text-slate-400 leading-relaxed relative z-10 border-l-2 border-emerald-500 pl-4 font-medium italic">
                "Importações regulares evitam lacunas críticas no fluxo de caixa."
              </p>
              
              <div class="mt-8 pt-6 border-t border-slate-700/50 relative z-10 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shadow-lg">
                    <mat-icon class="text-emerald-400 text-xl w-auto h-auto leading-none">auto_awesome</mat-icon>
                  </div>
                  <span class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Insight do Arquiteto</span>
                </div>
                <mat-icon class="text-slate-700 text-sm h-8 w-8 leading-8 text-center rounded-full border border-slate-800">north_east</mat-icon>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    @if (currentStep() === 'loading' || processing()) {
      <div class="fixed inset-0 bg-white/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center animate-in fade-in duration-500">
        <div class="relative w-20 h-20 mb-8">
          <div class="absolute inset-0 border-[6px] border-emerald-500/10 rounded-[2rem] transform rotate-45 animate-pulse"></div>
          <div class="absolute inset-0 border-[6px] border-emerald-500 border-t-transparent rounded-[2rem] transform rotate-45 animate-spin"></div>
          <mat-icon class="absolute inset-0 flex items-center justify-center text-4xl text-emerald-500 leading-none h-auto w-auto">bolt</mat-icon>
        </div>
        <div class="text-center space-y-2">
          <p class="text-xl font-black text-slate-900 tracking-tight">{{ loadingMsg() }}</p>
          <p class="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Sincronizando com o Core</p>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; width: 100%; }
  `]
})
export class ImportacaoPageComponent {
  private parserSrv = inject(ImportParserService);
  private importSrv = inject(ImportService);
  private featureAccess = inject(FeatureAccessService);
  private supabaseSrv = inject(SupabaseService);

  currentStep = signal<Step>('loading');
  importItems = signal<ImportItem[]>([]);
  accounts = signal<SupabaseAccount[]>([]);
  processing = signal(false);
  loadingMsg = signal('Verificando acesso...');
  resultSummary = signal({ success: 0, errors: 0 });
  recentImports = signal<RecentImport[]>([]);
  isDragOver = signal(false);

  constructor() {
    this.checkAccess();
  }

  async checkAccess() {
    try {
      const hasAccess = await this.featureAccess.hasFeature('bulk_import');
      if (!hasAccess) {
        this.currentStep.set('gated');
        return;
      }

      const { data } = await this.supabaseSrv.getAccounts();
      this.accounts.set(data || []);
      
      this.currentStep.set('upload');
    } catch (e) {
      this.currentStep.set('gated');
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  private async processFile(file: File) {
    this.loadingMsg.set('Processando planilha...');
    this.processing.set(true);
    
    try {
      const items = await this.parserSrv.parseExcelFile(file);
      this.importItems.set(items);
      this.currentStep.set('preview');
    } catch (e) {
      console.error(e);
      alert('Erro ao ler arquivo. Verifique se o formato é válido.');
    } finally {
      this.processing.set(false);
    }
  }

  async onConfirmImport(event: { items: ImportItem[], type: ImportType, targetId: string }) {
    this.loadingMsg.set('Salvando lançamentos no banco...');
    this.processing.set(true);

    try {
      const result = await this.importSrv.importData(event.items, event.type, event.targetId);
      this.resultSummary.set(result);
      this.currentStep.set('success');
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar dados.');
    } finally {
      this.processing.set(false);
    }
  }

  reset() {
    this.importItems.set([]);
    this.currentStep.set('upload');
  }

  downloadTemplate() {
    const link = document.createElement('a');
    link.href = '/assets/modelos/importacao_modelo.csv';
    link.download = 'importacao_modelo.csv';
    link.click();
  }

  getStepClass(step: string): string {
    const active = 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30';
    const upcoming = 'bg-slate-200 text-slate-400';
    const current = this.currentStep();

    if (step === 'upload' && (current === 'upload' || current === 'preview' || current === 'success')) return active;
    if (step === 'preview' && (current === 'preview' || current === 'success')) return active;
    if (step === 'success' && current === 'success') return active;
    
    return upcoming;
  }
}