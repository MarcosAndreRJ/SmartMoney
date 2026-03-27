import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ContactFormComponent } from './contact-form.component';
import { DeleteConfirmModalComponent } from '../../shared/components/delete-confirm-modal.component';
import { SupabaseService, SupabaseContact } from '../../core/services/supabase.service';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ContactFormComponent, DeleteConfirmModalComponent],
  template: `
    <div class="flex flex-col h-full bg-[#f8f9fa]">
      <!-- Page Header -->
      <div class="px-8 pt-8 pb-4 max-w-7xl mx-auto w-full">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 class="text-3xl font-bold text-slate-900">Meus Contatos</h1>
            <p class="text-slate-500 mt-1 italic">Gerencie sua lista de contatos frequentes e chaves PIX.</p>
          </div>
          <button (click)="showForm.set(true)"
            class="px-6 py-3 bg-[#0B1120] text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2">
            <mat-icon class="text-lg">add</mat-icon>
            Novo Contato
          </button>
        </div>

        <!-- Search Bar -->
        <div class="relative max-w-3xl mb-8">
          <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</mat-icon>
          <input 
            type="text" 
            [(ngModel)]="searchQuery"
            (input)="onSearch($event)"
            placeholder="Buscar contato pelo nome ou chave PIX..."
            class="w-full h-14 pl-12 pr-4 bg-white border border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/50 shadow-sm transition-all">
        </div>

        <!-- Tabs -->
        <div class="flex gap-8 border-b border-gray-100 mb-8">
          @for (tab of tabs; track tab.id) {
            <button 
              (click)="activeTab.set(tab.id)"
              class="pb-4 text-sm font-bold transition-all relative"
              [class.text-slate-900]="activeTab() === tab.id"
              [class.text-slate-400]="activeTab() !== tab.id">
              {{ tab.label }}
              @if (activeTab() === tab.id) {
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full animate-in fade-in duration-300"></div>
              }
            </button>
          }
        </div>

        <!-- Contacts Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
          @for (contact of filteredContacts(); track contact.id) {
            <div class="bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 hover:shadow-xl hover:shadow-slate-200/50 transition-all group flex flex-col relative overflow-hidden">
              
              <!-- Actions (Top Right) -->
              <div class="absolute top-4 right-4 flex gap-1">
                <button (click)="toggleFavorite(contact)" 
                  class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  [class.text-amber-400]="contact.is_favorite"
                  [class.text-slate-300]="!contact.is_favorite"
                  [class.hover:text-amber-500]="true">
                  <mat-icon class="text-[20px]">{{ contact.is_favorite ? 'star' : 'star_outline' }}</mat-icon>
                </button>
                <button (click)="confirmDelete(contact)" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
                  <mat-icon class="text-[20px]">delete_outline</mat-icon>
                </button>
              </div>

              <!-- Card Content -->
              <div class="flex items-center mb-6">
                <!-- Avatar / Initials -->
                <div class="w-14 h-14 rounded-full flex items-center justify-center text-emerald-600 font-bold text-lg shrink-0 bg-emerald-50">
                  {{ getInitials(contact.name) }}
                </div>
              </div>

              <div class="flex-1">
                <h3 class="font-bold text-slate-900 text-lg mb-2 truncate">{{ contact.name }}</h3>
                <div class="flex items-start gap-2 mb-6">
                  <!-- Bank Icon Simplified -->
                  <div class="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                    {{ contact.bank_name?.charAt(0) || 'B' }}
                  </div>
                  <div class="flex flex-col text-xs text-slate-400 leading-tight">
                    <span class="font-medium text-slate-500">{{ contact.bank_name || 'Banco não informado' }} • PIX</span>
                    <span>({{ contact.pix_key || 'Sem chave' }})</span>
                  </div>
                </div>
              </div>

              <button class="w-full h-12 bg-slate-50 rounded-2xl font-bold text-slate-700 text-sm hover:bg-[#0B1120] hover:text-white transition-all">
                Enviar Dinheiro
              </button>
            </div>
          } @empty {
            <div class="col-span-full py-20 text-center">
              <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <mat-icon class="text-slate-300 text-4xl">person_off</mat-icon>
              </div>
              <p class="text-slate-400 font-medium">Nenhum contato encontrado.</p>
            </div>
          }
        </div>
      </div>

      <!-- Novo Contato Sidebar/Modal -->
      @if (showForm()) {
        <app-contact-form
          (closeRequest)="showForm.set(false)"
          (saveContact)="handleSaveContact($event)">
        </app-contact-form>
      }

      <!-- Delete Confirmation Modal -->
      @if (contactToDelete()) {
        <app-delete-confirm-modal
          (cancel)="contactToDelete.set(null)"
          (confirm)="onConfirmDelete()">
        </app-delete-confirm-modal>
      }
    </div>
  `
})
export class ContactsComponent implements OnInit {
  private supabase = inject(SupabaseService);

  showForm = signal(false);
  activeTab = signal('all');
  searchQuery = signal('');
  contactToDelete = signal<SupabaseContact | null>(null);

  contacts = signal<SupabaseContact[]>([]);

  tabs = [
    { id: 'all', label: 'Todos os Contatos' },
    { id: 'recent', label: 'Recentes' },
    { id: 'favorites', label: 'Favoritos' }
  ];

  filteredContacts = computed(() => {
    const all = this.contacts();
    const query = this.searchQuery().toLowerCase();
    const tab = this.activeTab();

    let result = all;

    if (tab === 'favorites') {
      result = result.filter(c => c.is_favorite);
    }

    if (query) {
      result = result.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.pix_key?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query)
      );
    }

    return result;
  });

  async ngOnInit() {
    await this.loadContacts();
  }

  async loadContacts() {
    const { data, error } = await this.supabase.getContacts();
    if (data) {
      this.contacts.set(data as SupabaseContact[]);
    }
  }

  onSearch(event: any) {
    this.searchQuery.set(event.target.value);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  async handleSaveContact(event: any) {
    await this.loadContacts();
    this.showForm.set(false);
  }

  async toggleFavorite(contact: SupabaseContact) {
    const { data, error } = await this.supabase.updateContact(contact.id, {
      is_favorite: !contact.is_favorite
    });
    if (!error) {
      await this.loadContacts();
    }
  }

  confirmDelete(contact: SupabaseContact) {
    this.contactToDelete.set(contact);
  }

  async onConfirmDelete() {
    const contact = this.contactToDelete();
    if (contact) {
      const { error } = await this.supabase.deleteContact(contact.id);
      if (!error) {
        await this.loadContacts();
        this.contactToDelete.set(null);
      }
    }
  }
}
