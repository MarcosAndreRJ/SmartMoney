import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ImportItem, ImportType } from '../models/import.interface';

@Injectable({
  providedIn: 'root'
})
export class ImportService {
  private supabase = inject(SupabaseService);

  async importData(items: ImportItem[], type: ImportType, accountIdOrCardId: string): Promise<{ success: number; errors: number }> {
    const user = await this.supabase.client.auth.getUser();
    if (!user.data.user) throw new Error('Usuário não autenticado');

    const selectedItems = items.filter(i => i.selected);
    let success = 0;
    let errors = 0;

    // Supabase allows bulk inserts
    if (type === ImportType.TRANSACTION) {
      const records = selectedItems.map(item => ({
        user_id: user.data.user?.id,
        account_id: accountIdOrCardId,
        description: item.description,
        amount: item.amount,
        date: item.date,
        category: item.category || 'Outros',
        type: item.type,
        status: 'confirmed'
      }));

      const { error } = await this.supabase.client.from('transactions').insert(records);
      if (!error) success = records.length;
      else {
        console.error('Erro na importação de transações:', error);
        throw new Error(error.message);
      }
    } 
    else if (type === ImportType.CARD) {
      const records = selectedItems.map(item => ({
        user_id: user.data.user?.id,
        card_id: accountIdOrCardId,
        description: item.description,
        amount: item.amount,
        date: item.date,
        category: item.category || 'Outros',
        status: 'confirmed'
      }));

      const { error } = await this.supabase.client.from('credit_card_transactions').insert(records);
      if (!error) success = records.length;
      else {
        console.error('Erro na importação de cartões:', error);
        throw new Error(error.message);
      }
    }

    return { success, errors };
  }
}
