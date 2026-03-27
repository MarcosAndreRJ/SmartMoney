import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface RecurringSettings {
  autoGenerateOnOpen: boolean;
  generationHorizonDays: 30 | 60 | 90;
}

// Determines the next due date after a given date, based on frequency
function getNextDueDate(lastDate: Date, frequency: string): Date {
  const d = new Date(lastDate);
  switch (frequency) {
    case 'Diário':  d.setDate(d.getDate() + 1); break;
    case 'Semanal': d.setDate(d.getDate() + 7); break;
    case 'Mensal':  d.setMonth(d.getMonth() + 1); break;
    case 'Anual':   d.setFullYear(d.getFullYear() + 1); break;
    default:        d.setMonth(d.getMonth() + 1); break;
  }
  return d;
}

const SETTINGS_KEY = 'smartmoney_recurring_settings';

@Injectable({ providedIn: 'root' })
export class RecurringSchedulerService {
  private supabase = inject(SupabaseService);

  // Signals for UI state
  isRunning = signal(false);
  lastRunAt = signal<Date | null>(null);
  generatedCount = signal(0);

  // ── Settings (stored in localStorage) ──────────────────────────────────────

  getSettings(): RecurringSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Ensure generationHorizonDays has a valid default
        if (!parsed.generationHorizonDays) parsed.generationHorizonDays = 30;
        return parsed;
      }
    } catch {}
    return { autoGenerateOnOpen: true, generationHorizonDays: 30 };
  }

  saveSettings(settings: RecurringSettings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  // ── Main Entry Point ────────────────────────────────────────────────────────

  /** Call this at app startup. Only runs if user has enabled auto-generation. */
  async runIfEnabled(): Promise<void> {
    const settings = this.getSettings();
    if (!settings.autoGenerateOnOpen) return;
    await this.runScheduler();
  }

  /** Force a full scheduler run regardless of settings. */
  async runScheduler(): Promise<number> {
    if (this.isRunning()) return 0;

    this.isRunning.set(true);
    let totalGenerated = 0;

    try {
      const user = await this.supabase.getUser();
      if (!user) return 0;

      const settings = this.getSettings();
      const horizon = settings.generationHorizonDays || 30;

      // Fetch all active, non-archived recurring transactions
      const { data: recurrences, error } = await this.supabase.client
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('is_archived', false);

      if (error) throw error;
      if (!recurrences || recurrences.length === 0) return 0;

      // Horizon: generate only up to N days from today
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const horizon_end = new Date(today);
      horizon_end.setDate(horizon_end.getDate() + horizon);

      const generateUpTo = horizon_end;

      for (const rec of recurrences) {
        const generated = await this.processRecurring(rec, generateUpTo, user.id);
        totalGenerated += generated;
      }

      this.generatedCount.set(totalGenerated);
      this.lastRunAt.set(new Date());

      return totalGenerated;
    } catch (err) {
      console.error('[RecurringScheduler] Error during run:', err);
      return 0;
    } finally {
      this.isRunning.set(false);
    }
  }

  // ── Core Logic ──────────────────────────────────────────────────────────────

  private async processRecurring(
    rec: any,
    generateUpTo: Date,
    userId: string
  ): Promise<number> {
    let generated = 0;

    // Determine the anchor date: last generated date or start date
    const anchorDateStr: string = rec.last_generated_date || rec.start_date;
    let currentDate = new Date(anchorDateStr + 'T00:00:00');

    const startDate = new Date(rec.start_date + 'T00:00:00');
    if (!rec.last_generated_date && startDate > generateUpTo) {
      return 0;
    }

    let nextDue = rec.last_generated_date
      ? getNextDueDate(currentDate, rec.frequency)
      : startDate;

    let keepGoing = nextDue <= generateUpTo;

    // For installment type: check if we've already hit the limit
    if (rec.recurrence_type === 'installment') {
      const paid = rec.installments_paid ?? 0;
      const total = rec.installments_total;
      if (total && paid >= total) {
        // Mark as archived since all installments are done
        await this.supabase.client
          .from('recurring_transactions')
          .update({ is_archived: true, is_active: false })
          .eq('id', rec.id);
        return 0;
      }
    }

    while (keepGoing) {
      const dueDateStr = nextDue.toLocaleDateString('en-CA');

      // Check for duplicate: avoid generating if a transaction for this recurring+date already exists
      const { data: existing } = await this.supabase.client
        .from('transactions')
        .select('id')
        .eq('recurring_source_id', rec.id)
        .eq('date', dueDateStr)
        .maybeSingle();

      if (!existing) {
        // Use account from the recurring record itself, or fallback to first account
        const accountId = rec.account_id || null;

        // Create the transaction in Lançamentos
        const { error: insertError } = await this.supabase.client
          .from('transactions')
          .insert({
            user_id: userId,
            account_id: accountId,
            description: rec.name,
            amount: rec.amount,
            date: dueDateStr,
            category: rec.category,
            type: rec.type,
            status: 'pending',
            recurring_source_id: rec.id
          });

        if (insertError) {
          console.error('[RecurringScheduler] Error inserting transaction:', insertError);
          break;
        }

        generated++;

        // For installments, increment the count
        if (rec.recurrence_type === 'installment') {
          const newPaid = (rec.installments_paid ?? 0) + 1;
          const updatePayload: any = { installments_paid: newPaid, last_generated_date: dueDateStr };
          if (rec.installments_total && newPaid >= rec.installments_total) {
            updatePayload.is_archived = true;
            updatePayload.is_active = false;
          }
          await this.supabase.client
            .from('recurring_transactions')
            .update(updatePayload)
            .eq('id', rec.id);

          if (rec.installments_total && newPaid >= rec.installments_total) {
            break; // No more installments needed
          }
          rec.installments_paid = newPaid; // Update local copy for next iteration
        } else {
          // Fixed recurring: just update the last generated date
          await this.supabase.client
            .from('recurring_transactions')
            .update({ last_generated_date: dueDateStr })
            .eq('id', rec.id);
        }
      }

      // Move to next due date
      currentDate = nextDue;
      nextDue = getNextDueDate(currentDate, rec.frequency);
      keepGoing = nextDue <= generateUpTo;
    }

    return generated;
  }
}
