import { Component, EventEmitter, Output, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-importacao-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center w-full max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div class="text-center space-y-2">
        <h2 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Selecione seu arquivo</h2>
        <p class="text-slate-500 dark:text-slate-400">Arraste sua planilha Excel para começar a organizar suas finanças.</p>
      </div>

      <div 
        class="relative group w-full aspect-[16/9] flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/50 hover:bg-emerald-50/5 dark:hover:bg-emerald-500/5 overflow-hidden"
        (dragover)="$event.preventDefault(); isOver = true"
        (dragleave)="isOver = false"
        (drop)="onDrop($event)"
      >
        <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <div class="z-10 flex flex-col items-center space-y-4">
          <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
            <span class="material-symbols-rounded text-4xl text-emerald-500">upload_file</span>
          </div>
          <div class="text-center">
            <button 
              type="button" 
              (click)="fileInput.click()"
              class="text-lg font-semibold text-slate-900 dark:text-white hover:text-emerald-500 transition-colors"
            >
              Clique para fazer upload
            </button>
            <p class="text-sm text-slate-500">ou arraste e solte o arquivo</p>
          </div>
          <p class="text-xs text-slate-400 font-medium px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
            XLSX, XLS ou CSV (Máx. 10MB)
          </p>
        </div>

        <input 
          #fileInput 
          type="file" 
          class="hidden" 
          accept=".xlsx, .xls, .csv"
          (change)="onFileSelected($event)"
        >

        <!-- Glass overlay for dragover -->
        <div 
          *ngIf="isOver"
          class="absolute inset-0 bg-emerald-500/10 backdrop-blur-sm flex items-center justify-center animate-in fade-in"
        >
          <div class="px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-emerald-500/20">
            <span class="text-emerald-500 font-bold uppercase tracking-wider text-sm">Solte para importar</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <a 
          href="#" 
          class="flex items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/30 transition-all group"
        >
          <div class="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors">
            <span class="material-symbols-rounded">download</span>
          </div>
          <div class="ml-4">
            <h4 class="text-sm font-semibold text-slate-900 dark:text-white">Baixar Modelo</h4>
            <p class="text-xs text-slate-500">Formato otimizado SmartMoney</p>
          </div>
        </a>

        <div class="flex items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div class="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
            <span class="material-symbols-rounded">shield</span>
          </div>
          <div class="ml-4">
            <h4 class="text-sm font-semibold text-slate-900 dark:text-white">Privacidade</h4>
            <p class="text-xs text-slate-500">Arquivos processados localmente</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
  `]
})
export class ImportacaoUploadComponent {
  @Output() fileSelected = new EventEmitter<File>();
  isOver = false;

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.fileSelected.emit(file);
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isOver = false;
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.fileSelected.emit(file);
    }
  }
}
