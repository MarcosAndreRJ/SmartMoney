import { Injectable, inject } from '@angular/core';
import { SupabaseService, SupabaseCardTransaction, SupabaseAccount, SupabaseCreditCardBill, SupabaseTransaction } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class CreditCardBillSyncService {
  private supabase = inject(SupabaseService);

  /**
   * Determine the bill cycle for a given transaction date and card.
   * Returns { year, month } where month is 1-12.
   */
  public getBillCycle(dateStr: string, closeDay: number, dueDay: number): { year: number, month: number, due_date: string, closing_date: string } {
    if (!dateStr) dateStr = new Date().toISOString().split('T')[0];
    const dStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = dStr.split('-');
    
    let y = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10); // 1-12
    const d = parseInt(parts[2], 10);
    
    let txMonth = m;
    let txYear = y;

    // If bought on or after closing day, falls into the next month's closing
    if (d >= closeDay) {
      txMonth++;
      if (txMonth > 12) {
        txMonth = 1;
        txYear++;
      }
    }

    let dueMonth = txMonth;
    let dueYear = txYear;
    
    // If closing day is numerically greater than due day (e.g. close 25, due 5 of next month)
    // Then the due date is in the next month relative to the closing month
    if (closeDay > dueDay) {
      dueMonth++;
      if (dueMonth > 12) {
         dueMonth = 1;
         dueYear++;
      }
    }

    const due_date = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
    const closingMonth = txMonth;
    const closingYear = txYear;
    const closing_date = `${closingYear}-${String(closingMonth).padStart(2, '0')}-${String(closeDay).padStart(2, '0')}`;

    return { year: dueYear, month: dueMonth, due_date, closing_date };
  }

  /**
   * Synchronizes bills and their mirrored transactions for a set of affected cards and cycles.
   * Call this after any CUD operation on credit_card_transactions.
   */
  async syncBills(affected: { cardId: string, date: string }[]) {
    // 1. Get unique combinations of cardId and cycles to sync
    const cardsResponse = await this.supabase.getAccounts();
    if (cardsResponse.error || !cardsResponse.data) {
      console.error('Error fetching accounts for bill sync', cardsResponse.error);
      return;
    }
    const accounts = cardsResponse.data as SupabaseAccount[];

    const syncTargets = new Map<string, { cardId: string, cycleYear: number, cycleMonth: number, closingDate: string, dueDate: string }>();

    for (const item of affected) {
      const card = accounts.find(a => a.id === item.cardId);
      if (!card) continue;

      const closeDay = Number(card.closing_date || 10);
      const dueDay = Number(card.due_date || 17);

      const cycle = this.getBillCycle(item.date, closeDay, dueDay);
      const key = `${item.cardId}-${cycle.year}-${cycle.month}`;
      syncTargets.set(key, { 
        cardId: item.cardId, 
        cycleYear: cycle.year, 
        cycleMonth: cycle.month,
        closingDate: cycle.closing_date,
        dueDate: cycle.due_date
      });
    }

    const user = await this.supabase.getUser();
    if (!user) return;

    // We need to know which account is the primary checking account to link the mirrored transactions to it.
    const nonCardAccounts = accounts.filter(a => a.account_type !== 'credit_card');
    let defaultPaymentAccountId: string | undefined;
    if (nonCardAccounts.length > 0) {
      defaultPaymentAccountId = nonCardAccounts.find(a => a.is_main_account && a.account_type === 'checking')?.id
        || nonCardAccounts.find(a => a.account_type === 'checking')?.id
        || nonCardAccounts.find(a => a.is_main_account)?.id
        || nonCardAccounts[0].id;
    }

    if (!defaultPaymentAccountId) {
       console.warn('No payment account found to link mirrored transactions.');
       return;
    }

    for (const target of syncTargets.values()) {
      await this.processBillSync(user.id, target, accounts, defaultPaymentAccountId);
    }
  }

  /**
   * Ponto de entrada para o "Start" do sistema ou Re-sincronização total.
   * Busca todas as transações de cartão existentes e garante que todas as faturas 
   * e espelhos em transactions estejam corretos.
   */
  async syncAllCardsBills() {
    const user = await this.supabase.getUser();
    if (!user) return;

    // 1. Buscar todas as transações de cartão
    const { data: allTxs, error } = await this.supabase.client
      .from('credit_card_transactions')
      .select('card_id, date')
      .eq('user_id', user.id);

    if (error || !allTxs) {
      console.error('Error fetching all card txs for global sync', error);
      return;
    }

    if (allTxs.length === 0) return;

    // 2. Chamar o syncBills com a lista de todas as combinações afetadas
    const affected = allTxs.map(tx => ({ cardId: tx.card_id, date: tx.date }));
    await this.syncBills(affected);
  }

  private async processBillSync(userId: string, target: any, accounts: SupabaseAccount[], defaultPaymentAccountId: string) {
    const card = accounts.find(a => a.id === target.cardId);
    if (!card) return;

    // 1. Fetch the existing bill for this cycle, if any
    const { data: billsData, error: billError } = await this.supabase.client
      .from('credit_card_bills')
      .select('*')
      .eq('card_id', target.cardId)
      .eq('cycle_year', target.cycleYear)
      .eq('cycle_month', target.cycleMonth);

    let bill = (billsData && billsData.length > 0) ? billsData[0] as SupabaseCreditCardBill : null;

    // 2. Re-calculate the total for this bill by checking all transactions for this card
    const { data: allCardTxs, error: txError } = await this.supabase.client
      .from('credit_card_transactions')
      .select('*')
      .eq('card_id', target.cardId)
      .eq('status', 'confirmed'); // pending txs are not usually billed until confirmed? Or maybe we count pending too? Let's count both since they represent committed money. Actually, the UI component computes current bill using ONLY confirmed txs. We will use ONLY confirmed.

    if (txError) {
      console.error('Error fetching card txs', txError);
      return;
    }

    let totalAmount = 0;
    const closeDay = Number(card.closing_date || 10);
    const dueDay = Number(card.due_date || 17);

    for (const tx of (allCardTxs as SupabaseCardTransaction[])) {
      const cycle = this.getBillCycle(tx.date, closeDay, dueDay);
      if (cycle.year === target.cycleYear && cycle.month === target.cycleMonth) {
        totalAmount += Number(tx.amount || 0);
      }
    }

    // 3. Upsert Bill
    let savedBillId: string;
    if (bill) {
      const { data: updatedBill, error: updateError } = await this.supabase.client
        .from('credit_card_bills')
        .update({
          total_amount: totalAmount,
          closing_date: target.closingDate,
          due_date: target.dueDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', bill.id)
        .select()
        .single();
      
      if (updateError) { console.error('Error updating bill', updateError); return; }
      bill = updatedBill as SupabaseCreditCardBill;
      savedBillId = bill.id;
    } else {
      const { data: insertedBill, error: insertError } = await this.supabase.client
        .from('credit_card_bills')
        .insert({
          user_id: userId,
          card_id: target.cardId,
          cycle_year: target.cycleYear,
          cycle_month: target.cycleMonth,
          closing_date: target.closingDate,
          due_date: target.dueDate,
          total_amount: totalAmount,
          status: 'open'
        })
        .select()
        .single();

      if (insertError) { console.error('Error inserting bill', insertError); return; }
      bill = insertedBill as SupabaseCreditCardBill;
      savedBillId = bill.id;
    }

    // 4. Update the mirrored transaction
    const monthStr = String(target.cycleMonth).padStart(2, '0');
    const description = `Pagamento Fatura - ${card.institution_name} - ${monthStr}/${target.cycleYear}`;

    if (bill.linked_transaction_id) {
      // Check the status of the linked transaction
      const { data: linkedTxData } = await this.supabase.client
        .from('transactions')
        .select('*')
        .eq('id', bill.linked_transaction_id)
        .single();
      
      const linkedTx = linkedTxData as SupabaseTransaction;

      if (linkedTx) {
        if (linkedTx.status === 'confirmed') {
          // Rule: If already paid, DO NOT override automatically if the total changed.
          // For now, we leave it alone. The bill itself reflects the true amount, but the paid transaction is frozen.
          // We can optionally add an adjustment transaction if totalAmount != linkedTx.amount, but the instruction said to "avaliar abordagem segura: não sobrescrever automaticamente o histórico". 
          // So we skip updating the transaction amount.
          console.log(`[BillSync] Bill ${bill.id} is closed/paid. Skipping mirrored tx update.`);
          
          // But if the total amount becomes 0, we shouldn't delete a confirmed transaction automatically. We just keep it.
        } else {
          // Pending transaction -> safe to update or delete
          if (totalAmount <= 0) {
            // Delete it
            await this.supabase.client.from('transactions').delete().eq('id', linkedTx.id);
            await this.supabase.client.from('credit_card_bills').update({ linked_transaction_id: null }).eq('id', bill.id);
          } else {
            // Update it
            await this.supabase.client.from('transactions').update({
              amount: totalAmount,
              date: target.dueDate,
              description: description
            }).eq('id', linkedTx.id);
          }
        }
      } else {
        // Linked tx not found in DB (maybe deleted manually), so recreate if total > 0
        if (totalAmount > 0) {
          await this.createMirroredTransaction(userId, bill, defaultPaymentAccountId, description);
        }
      }
    } else {
      // No linked transaction yet
      if (totalAmount > 0) {
        await this.createMirroredTransaction(userId, bill, defaultPaymentAccountId, description);
      }
    }
  }

  private async createMirroredTransaction(userId: string, bill: SupabaseCreditCardBill, defaultPaymentAccountId: string, description: string) {
    const { data: newTx, error: txError } = await this.supabase.client
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: defaultPaymentAccountId,
        description: description,
        amount: bill.total_amount,
        date: bill.due_date,
        category: 'Pagamento',
        type: 'expense',
        status: 'pending',
        credit_card_bill_id: bill.id
      })
      .select()
      .single();

    if (!txError && newTx) {
      await this.supabase.client
        .from('credit_card_bills')
        .update({ linked_transaction_id: newTx.id })
        .eq('id', bill.id);
    } else {
      console.error('Error creating mirrored transaction', txError);
    }
  }
}
