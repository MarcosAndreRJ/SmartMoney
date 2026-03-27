import { Component, signal, output, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService } from '../../core/services/supabase.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
    selector: 'app-avatar-upload-modal',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    template: `
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
        <!-- Header -->
        <div class="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <mat-icon class="text-emerald-600">add_a_photo</mat-icon>
            </div>
            <div>
              <h2 class="text-xl font-bold text-slate-900">Alterar Foto de Perfil</h2>
              <p class="text-xs text-slate-400">Atualize sua imagem de identificação no sistema.</p>
            </div>
          </div>
          <button (click)="closeRequest.emit()" class="text-gray-400 hover:text-gray-600 transition-colors">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Body -->
        <div class="p-8 space-y-8">
          <!-- Current Avatar Preview -->
          <div class="flex flex-col items-center gap-4">
            <div class="relative w-32 h-32">
              <div class="w-full h-full rounded-full border-4 border-slate-50 overflow-hidden shadow-inner bg-slate-100">
                @if (previewUrl() || currentAvatarUrl()) {
                  <img [src]="previewUrl() || currentAvatarUrl()" alt="Preview" class="w-full h-full object-cover">
                } @else {
                  <div class="w-full h-full flex items-center justify-center text-slate-300">
                    <mat-icon class="text-5xl">person</mat-icon>
                  </div>
                }
              </div>
              @if (isSuccess()) {
                <div class="absolute bottom-1 right-1 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white">
                  <mat-icon class="text-lg">check</mat-icon>
                </div>
              }
            </div>
            <div class="text-center">
              <p class="font-bold text-slate-900">Sua Foto Atual</p>
              <p class="text-xs text-slate-400">Aparecerá no seu perfil e extratos</p>
            </div>
          </div>

          <!-- Upload Area -->
          <div 
            class="relative border-2 border-dashed rounded-2xl p-8 transition-all group flex flex-col items-center justify-center gap-4 text-center"
            [class.border-emerald-300]="isDragging()"
            [class.bg-emerald-50/30]="isDragging()"
            [class.border-slate-200]="!isDragging()"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)">
            
            <input type="file" #fileInput class="hidden" (change)="onFileSelected($event)" accept="image/*">
            
            <div class="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <mat-icon>cloud_upload</mat-icon>
            </div>
            
            <div>
              <p class="font-bold text-slate-900">Upload de Foto</p>
              <p class="text-xs text-slate-400 mt-1">
                Arraste uma photo aqui ou <button (click)="fileInput.click()" class="text-emerald-600 font-bold hover:underline">clique para selecionar</button>
              </p>
            </div>

            @if (selectedFile()) {
              <div class="mt-2 text-sm font-bold text-emerald-600 flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full">
                <mat-icon class="text-lg text-emerald-500">image</mat-icon>
                {{ selectedFile()?.name }}
                <button (click)="clearSelection()" class="text-emerald-400 hover:text-red-500 ml-2">
                  <mat-icon class="text-sm">close</mat-icon>
                </button>
              </div>
            }

            <button (click)="fileInput.click()" class="mt-2 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all">
              Selecionar Arquivo
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-8 py-6 bg-slate-50/50 flex gap-4">
          <button (click)="closeRequest.emit()"
            class="flex-1 h-12 bg-white border border-gray-200 text-slate-700 rounded-xl font-bold hover:bg-gray-50 transition-all">
            Cancelar
          </button>
          <button (click)="upload()" [disabled]="!selectedFile() || isLoading()"
            class="flex-1 h-12 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center">
            @if (isLoading()) {
              <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            } @else {
              Salvar Foto
            }
          </button>
        </div>
      </div>
    </div>
  `
})
export class AvatarUploadModalComponent {
    currentAvatarUrl = input<string>('');
    closeRequest = output<void>();
    uploadSuccess = output<string>();

    private supabase = inject(SupabaseService);
    private toast = inject(ToastService);

    selectedFile = signal<File | null>(null);
    previewUrl = signal<string | null>(null);
    isLoading = signal(false);
    isDragging = signal(false);
    isSuccess = signal(false);

    onDragOver(event: DragEvent) {
        event.preventDefault();
        this.isDragging.set(true);
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        this.isDragging.set(false);
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        this.isDragging.set(false);
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            this.handleFile(files[0]);
        }
    }

    onFileSelected(event: any) {
        const files = event.target.files;
        if (files && files.length > 0) {
            this.handleFile(files[0]);
        }
    }

    handleFile(file: File) {
        // Validation
        if (!file.type.startsWith('image/')) {
            this.toast.error('Arquivo inválido', 'Por favor, selecione uma imagem.');
            return;
        }

        if (file.size > 2 * 1024 * 1024) { // 2MB
            this.toast.error('Arquivo muito grande', 'A imagem deve ter no máximo 2MB.');
            return;
        }

        this.selectedFile.set(file);
        const reader = new FileReader();
        reader.onload = () => {
            this.previewUrl.set(reader.result as string);
        };
        reader.readAsDataURL(file);
    }

    clearSelection() {
        this.selectedFile.set(null);
        this.previewUrl.set(null);
    }

    async upload() {
        const file = this.selectedFile();
        if (!file) return;

        this.isLoading.set(true);
        try {
            const url = await this.supabase.uploadAvatar(file);
            await this.supabase.updateUserMetadata({ avatar_url: url });
            this.isSuccess.set(true);
            this.toast.success('Sucesso!', 'Sua foto de perfil foi atualizada.');

            // Short delay for visual feedback of success icon
            setTimeout(() => {
                this.uploadSuccess.emit(url);
            }, 1000);
        } catch (error: any) {
            this.toast.error('Erro no upload', error.message || 'Ocorreu um erro ao salvar sua foto.');
        } finally {
            this.isLoading.set(false);
        }
    }
}
