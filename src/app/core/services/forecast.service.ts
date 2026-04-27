import { Injectable, inject } from '@angular/core';
import { SupabaseService, SupabaseTransaction, SupabaseLoan, SupabaseAccount, SupabaseCardTransaction } from './supabase.service';

export interface ForecastEvent {
  id: string;
  direction: 'income' | 'expense';
  amount: number;
  dueDate: string;
  competenceDate: string;
  description: string;
  category: string;
  sourceType: 'transaction' | 'recurring' | 'loan_fixed' | 'loan_interest' | 'credit_card';
  sourceId?: string;
  status: 'pending' | 'confirmed';
  confidenceLevel: 'confirmed' | 'predicted' | 'estimated';
  recurringSourceId?: string;
  loanId?: string;
  accountId?: string;
  cardId?: string;
}

export interface TimelinePoint {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface ForecastAlert {
  type: 'negative_balance' | 'high_concentration' | 'over_commitment';
  severity: 1 | 2 | 3;
  message: string;
  date?: string;
  metadata?: any;
}

export interface ForecastSummary {
  currentBalance: number;
  projectedEndOfMonth: number;
  projectedEndOfNextMonth: number;
  totalExpectedIncome: number;
  totalExpectedExpense: number;
  monthRealizedInflow: number;
  monthRealizedOutflow: number;
  monthPendingInflow: number;
  monthPendingOutflow: number;
  monthBreakdown: {
    transactions: number;
    recurring: number;
    loans: number;
    cards: number;
  };
  incomeBreakdown: {
    transactions: number;
    recurring: number;
  };
  structuralAnalysis: {
    recurringIncome: number;
    recurringExpense: number;
    loanInstallments: number;
    netStructuralBalance: number;
    activeRecurringCount: number;
    structuralHealthStatus: 'positive' | 'warning' | 'negative';
  };
  committedAmount: number;
  freeCash: number;
  warningLevel: 0 | 1 | 2 | 3;
  alerts: ForecastAlert[];
}

export type ForecastScenario = 'base' | 'conservative' | 'optimistic';

export interface ForecastIntelligence {
  summary: ForecastSummary;
  timeline: TimelinePoint[];
  events: ForecastEvent[];
  scenario: ForecastScenario;
  accounts: (SupabaseAccount & { currentBalance: number })[];
}

// ── Helpers de Data ─────────────────────────────────────────────────────────

/** Retorna 'YYYY-MM-DD' de hoje sem fusos horários */
function todayStr(): string {
  const d = new Date();
  return localDateStr(d);
}

/** Formata um Date local como 'YYYY-MM-DD' */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parseia 'YYYY-MM-DD' como Date ao meio-dia local (evita timezone shifts) */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Calcula o último dia do mês (ex: horizonMonths=0 → fim do mês atual)
 * horizonMonths=0 → fim de Abril
 * horizonMonths=1 → fim de Maio
 */
function endOfMonth(offsetMonths: number): string {
  const now = new Date();
  // Dia 0 do próximo mês = último dia do mês atual + offset
  const d = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0, 12, 0, 0);
  return localDateStr(d);
}

/**
 * Calcula a data de vencimento da fatura de cartão.
 * REGRA:
 *   1. Se dia_compra >= fechamento → compra vai para a fatura do PRÓXIMO mês
 *   2. O vencimento é sempre no mesmo mês da fatura, no dueDay
 *   3. Se dueDay <= closingDay → vencimento cai no mês seguinte ao fechamento
 */
function calculateCardDueDate(txDateStr: string, closingDay: number, dueDay: number): string {
  if (!txDateStr) return todayStr();

  const txDate = parseLocalDate(txDateStr);
  if (isNaN(txDate.getTime())) return txDateStr.split('T')[0];

  const txDay = txDate.getDate();
  let billingMonth = txDate.getMonth(); // 0-indexed
  const billingYear = txDate.getFullYear();

  // 1. Pertencimento de fatura: se comprou no fechamento ou depois → próxima fatura
  if (txDay >= closingDay) {
    billingMonth++;
  }

  // 2. Cálculo do mês de vencimento
  // Se dueDay vem antes ou no mesmo dia do fechamento, o vencimento é no mês seguinte ao da fatura
  // Ex: fecha dia 20, vence dia 5 → vencimento é no mês seguinte ao da fatura
  let dueMonth = billingMonth;
  if (dueDay <= closingDay) {
    dueMonth++;
  }

  // Date() lida com overflow automaticamente (mês 13 → Janeiro do ano seguinte)
  const dueDate = new Date(billingYear, dueMonth, dueDay, 12, 0, 0);

  // Segurança: vencimento nunca pode ser antes da data da compra
  if (dueDate <= txDate) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }

  return localDateStr(dueDate);
}

// ── Service ─────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class ForecastService {
  private supabase = inject(SupabaseService);
  private _cachedTransactions: SupabaseTransaction[] = [];

  // ── API Pública ─────────────────────────────────────────────────────────────

  async getForecastIntelligence(
    horizonMonths: number = 1,
    scenario: ForecastScenario = 'base'
  ): Promise<ForecastIntelligence> {
    const today = todayStr();
    const firstDayOfMonth = today.substring(0, 8) + '01';

    // Período de análise: do início do mês atual até o final do horizonte
    const periodEnd = endOfMonth(horizonMonths - 1);

    // 1. Buscar todos os dados em paralelo
    const [allTransactions, recurring, loans, accounts, cardTransactions] = await Promise.all([
      this.fetchTransactions(),
      this.fetchRecurring(),
      this.fetchLoans(),
      this.fetchAccounts(),
      this.fetchCardTransactions()
    ]);

    const accountsExceptCards = accounts.filter(a => a.account_type !== 'credit_card');

    // 2. Saldo Real HOJE
    // Saldo inicial das contas + todas as transações confirmadas até hoje
    const initialBalanceSum = accountsExceptCards.reduce((sum, a) => sum + Number(a.initial_balance || 0), 0);
    const confirmedImpact = allTransactions
      .filter(tx => tx.status === 'confirmed' && tx.date <= today)
      .reduce((sum, tx) => sum + (tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount)), 0);

    const currentRealBalance = initialBalanceSum + confirmedImpact;

    // 3. Gerar eventos do período (coletamos desde o início do mês para análise estrutural)
    const events = this.buildPeriodEvents(
      allTransactions, recurring, loans, accounts, cardTransactions,
      firstDayOfMonth, periodEnd, today, scenario
    );

    // 4. Timeline acumulada
    const timeline = this.buildTimeline(events, currentRealBalance, today, periodEnd);

    // 5. Alertas
    const alerts = this.scanRisks(timeline, events);

    // 6. Sumário
    const summary = this.buildSummary(
      events, allTransactions, recurring, loans, currentRealBalance, timeline, alerts, today, periodEnd
    );

    // 7. Saldo das contas individuais
    const accountsWithBalance = accountsExceptCards.map(acc => {
      const impact = allTransactions
        .filter(tx => tx.account_id === acc.id && tx.status === 'confirmed' && tx.date <= today)
        .reduce((sum, tx) => sum + (tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount)), 0);
      return { ...acc, currentBalance: Number(acc.initial_balance || 0) + impact };
    });

    return { summary, timeline, events, scenario, accounts: accountsWithBalance };
  }

  // ── Motor de Eventos ────────────────────────────────────────────────────────

  private buildPeriodEvents(
    transactions: SupabaseTransaction[],
    recurring: any[],
    loans: SupabaseLoan[],
    accounts: SupabaseAccount[],
    cardTransactions: SupabaseCardTransaction[],
    periodStart: string,
    periodEnd: string,
    today: string,
    scenario: ForecastScenario
  ): ForecastEvent[] {
    const events: ForecastEvent[] = [];

    transactions.forEach(tx => {
      if (tx.date >= periodStart && tx.date <= periodEnd) {
        // Se for confirmada e for anterior a hoje, ela já está no saldo inicial.
        // Nós a incluímos no array de eventos apenas para fins de análise estrutural,
        // mas o buildTimeline irá filtrá-la para não impactar o saldo futuro.
        // Se for futura ou pendente, ela impacta o forecast.
        const isPastConfirmed = tx.status === 'confirmed' && tx.date < today;

        events.push({
          id: `tx-${tx.id}`,
          sourceType: 'transaction',
          sourceId: tx.id,
          description: tx.description,
          amount: Number(tx.amount),
          direction: tx.type as 'income' | 'expense',
          status: tx.status as 'pending' | 'confirmed',
          competenceDate: tx.date,
          dueDate: tx.date,
          confidenceLevel: tx.status === 'confirmed' ? 'confirmed' : 'predicted',
          accountId: tx.account_id,
          category: tx.category,
          recurringSourceId: tx.recurring_source_id,
          loanId: tx.loan_id
        });
      }
    });

    // 2. Recorrências
    const recurringTxDates = new Map<string, Set<string>>();
    transactions.filter(t => !!t.recurring_source_id).forEach(t => {
      if (!recurringTxDates.has(t.recurring_source_id!)) recurringTxDates.set(t.recurring_source_id!, new Set());
      recurringTxDates.get(t.recurring_source_id!)!.add(t.date.split('T')[0]);
    });

    recurring.forEach(rec => {
      if (rec.is_active === false) return;

      // Começamos do start_date para garantir que pegamos todas as instâncias no período
      let cursor = parseLocalDate(rec.start_date);
      const endDate = rec.end_date ? parseLocalDate(rec.end_date) : null;
      
      let count = 0;
      while (count < 100) {
        if (isNaN(cursor.getTime())) break;
        const dateStr = localDateStr(cursor);
        
        if (dateStr > periodEnd) break;
        if (endDate && cursor > endDate) break;

        const alreadyMaterialized = recurringTxDates.get(rec.id)?.has(dateStr) ?? false;
        
        // Inclui se estiver no período e não estiver materializada.
        // Projeções só fazem sentido de hoje em diante.
        if (dateStr >= periodStart && dateStr >= today && !alreadyMaterialized) {
          events.push({
            id: `proj-rec-${rec.id}-${dateStr}`,
            sourceType: 'recurring',
            sourceId: rec.id,
            recurringSourceId: rec.id,
            description: rec.name,
            amount: Number(rec.amount),
            direction: rec.type as 'income' | 'expense',
            status: 'pending',
            competenceDate: dateStr,
            dueDate: dateStr,
            confidenceLevel: 'predicted',
            accountId: rec.account_id,
            category: rec.category
          });
        }
        
        const next = this.nextDate(cursor, rec.frequency);
        if (next.getTime() <= cursor.getTime()) break;
        cursor = next;
        count++;
      }
    });

    // 3. Empréstimos
    const loanPaidInstallments = new Map<string, Set<number>>();
    transactions.filter(t => !!t.loan_id).forEach(t => {
      if (!loanPaidInstallments.has(t.loan_id!)) loanPaidInstallments.set(t.loan_id!, new Set());
      if (t.installment_number) loanPaidInstallments.get(t.loan_id!)!.add(t.installment_number);
    });

    loans.forEach(loan => {
      if (loan.status === 'paid') return;
      if (loan.type === 'fixed') {
        const paidSet = loanPaidInstallments.get(loan.id) || new Set<number>();
        for (let i = 1; i <= (loan.total_installments || 120); i++) {
          if (paidSet.has(i)) continue;
          const dueDate = parseLocalDate(loan.start_date);
          dueDate.setMonth(dueDate.getMonth() + (i - 1));
          const dateStr = localDateStr(dueDate);
          if (dateStr >= periodStart && dateStr <= periodEnd) {
            events.push({
              id: `proj-loan-${loan.id}-${i}`,
              sourceType: 'loan_fixed',
              sourceId: loan.id,
              loanId: loan.id,
              description: `Parcela ${i}/${loan.total_installments} - ${loan.creditor_name}`,
              amount: Number(loan.installment_amount || 0),
              direction: 'expense',
              status: 'pending',
              competenceDate: dateStr,
              dueDate: dateStr,
              confidenceLevel: 'confirmed',
              accountId: loan.account_id,
              category: 'Empréstimos'
            });
          }
        }
      }
    });

    // 4. Cartões (Vencimentos)
    const creditCards = accounts.filter(a => a.account_type === 'credit_card');
    const filtered = scenario === 'conservative'
      ? events.filter(e => e.confidenceLevel !== 'estimated')
      : events;

    return filtered.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  // ── Timeline ────────────────────────────────────────────────────────────────

  private buildTimeline(
    events: ForecastEvent[],
    initialBalance: number,
    periodStart: string,
    periodEnd: string
  ): TimelinePoint[] {
    const dayGroups = new Map<string, { inflow: number; outflow: number; confidence: string }>();

    // Apenas eventos de hoje em diante impactam a timeline de saldo futuro.
    // Transações passadas já estão incorporadas no initialBalance (currentRealBalance).
    events
      .filter(e => e.dueDate >= periodStart)
      .forEach(e => {
        const day = e.dueDate;
        const cur = dayGroups.get(day) || { inflow: 0, outflow: 0, confidence: 'high' };
        if (e.direction === 'income') cur.inflow += e.amount;
        else cur.outflow += e.amount;
        if (e.confidenceLevel === 'estimated') cur.confidence = 'low';
        else if (e.confidenceLevel === 'predicted' && cur.confidence !== 'low') cur.confidence = 'medium';
        dayGroups.set(day, cur);
      });

    const timeline: TimelinePoint[] = [];
    let running = initialBalance;

    timeline.push({
      date: periodStart,
      inflow: 0,
      outflow: 0,
      balance: parseFloat(running.toFixed(2)),
      confidence: 'high'
    });

    Array.from(dayGroups.keys()).sort().forEach(day => {
      if (day < periodStart || day > periodEnd) return;
      const data = dayGroups.get(day)!;
      running += data.inflow - data.outflow;
      timeline.push({
        date: day,
        inflow: data.inflow,
        outflow: data.outflow,
        balance: parseFloat(running.toFixed(2)),
        confidence: data.confidence as 'high' | 'medium' | 'low'
      });
    });

    if (timeline[timeline.length - 1]?.date !== periodEnd) {
      timeline.push({
        date: periodEnd,
        inflow: 0,
        outflow: 0,
        balance: parseFloat(running.toFixed(2)),
        confidence: 'low'
      });
    }

    return timeline;
  }

  // ── Sumário ─────────────────────────────────────────────────────────────────

  private buildSummary(
    events: ForecastEvent[],
    allTransactions: SupabaseTransaction[],
    recurring: any[],
    loans: SupabaseLoan[],
    currentBalance: number,
    timeline: TimelinePoint[],
    alerts: ForecastAlert[],
    today: string,
    periodEnd: string
  ): ForecastSummary {

    // ── Eventos futuros (de hoje em diante) = impacto real no caixa ──────────
    const eventsFromToday = events.filter(e => e.dueDate >= today);

    const totalExpectedIncome = eventsFromToday
      .filter(e => e.direction === 'income')
      .reduce((s, e) => s + e.amount, 0);

    const totalExpectedExpense = eventsFromToday
      .filter(e => e.direction === 'expense')
      .reduce((s, e) => s + e.amount, 0);

    // ── Saldo Final = fórmula única e consistente ────────────────────────
    const projectedBalance = currentBalance + totalExpectedIncome - totalExpectedExpense;

    const breakdown = {
      transactions: eventsFromToday.filter(e => e.sourceType === 'transaction' && e.direction === 'expense').reduce((s, e) => s + e.amount, 0),
      recurring:    eventsFromToday.filter(e => e.sourceType === 'recurring'    && e.direction === 'expense').reduce((s, e) => s + e.amount, 0),
      loans:        eventsFromToday.filter(e => (e.sourceType === 'loan_fixed' || e.sourceType === 'loan_interest')).reduce((s, e) => s + e.amount, 0),
      cards:        eventsFromToday.filter(e => e.sourceType === 'credit_card').reduce((s, e) => s + e.amount, 0)
    };

    const incomeBreakdown = {
      transactions: eventsFromToday.filter(e => e.sourceType === 'transaction' && e.direction === 'income').reduce((s, e) => s + e.amount, 0),
      recurring:    eventsFromToday.filter(e => e.sourceType === 'recurring'    && e.direction === 'income').reduce((s, e) => s + e.amount, 0)
    };

    // ── Análise Estrutural — fonte exclusiva: recurring_transactions + loans ───
    const structuralAnalysis = this.calcStructuralAnalysis(recurring, loans, today, periodEnd);

    const committed = eventsFromToday
      .filter(e => e.direction === 'expense' && e.confidenceLevel !== 'estimated')
      .reduce((s, e) => s + e.amount, 0);

    return {
      currentBalance,
      projectedEndOfMonth: projectedBalance,
      projectedEndOfNextMonth: projectedBalance,
      totalExpectedIncome,
      totalExpectedExpense,
      monthRealizedInflow: 0,
      monthRealizedOutflow: 0,
      monthPendingInflow: totalExpectedIncome,
      monthPendingOutflow: totalExpectedExpense,
      monthBreakdown: breakdown,
      incomeBreakdown,
      structuralAnalysis,
      committedAmount: committed,
      freeCash: projectedBalance,
      warningLevel: (alerts.length > 0 ? Math.max(...alerts.map(a => a.severity)) : 0) as 0 | 1 | 2 | 3,
      alerts
    };
  }

  /**
   * Calcula a análise estrutural lendo EXCLUSIVAMENTE de recurring_transactions e loans.
   * Não usa o array de events. Não cruza com transactions.
   *
   * Para recorrências do tipo FIXO: gera ocorrências no intervalo [today, periodEnd].
   * Para recorrências do tipo PARCELADO: respeita installments_total - installments_paid.
   * Para empréstimos FIXED: gera as parcelas que vencem no intervalo.
   */
  private calcStructuralAnalysis(
    recurring: any[],
    loans: SupabaseLoan[],
    rangeStart: string,
    rangeEnd: string
  ): ForecastSummary['structuralAnalysis'] {
    let recurringIncome = 0;
    let recurringExpense = 0;
    const activeIds = new Set<string>();

    recurring.forEach(rec => {
      if (rec.is_active === false) return;

      const startDate = rec.start_date ? parseLocalDate(rec.start_date) : null;
      const endDate   = rec.end_date   ? parseLocalDate(rec.end_date)   : null;

      if (!startDate || isNaN(startDate.getTime())) return;

      // Para parcelado: calcular quantas parcelas ainda restam
      let remainingInstallments: number | null = null;
      if (rec.recurrence_type === 'installment' || rec.recurrence_type === 'parcelado') {
        const total = Number(rec.installments_total || rec.total_installments || 0);
        const paid  = Number(rec.installments_paid  || rec.paid_installments  || 0);
        if (total > 0) remainingInstallments = Math.max(0, total - paid);
      }

      let cursor = new Date(startDate);
      let count = 0;
      let installmentsGenerated = 0;

      while (count < 200) {
        if (isNaN(cursor.getTime())) break;
        const dateStr = localDateStr(cursor);

        if (dateStr > rangeEnd) break;
        if (endDate && cursor > endDate) break;
        if (remainingInstallments !== null && installmentsGenerated >= remainingInstallments) break;

        if (dateStr >= rangeStart) {
          const amount = Number(rec.amount);
          if (rec.type === 'income') recurringIncome  += amount;
          else                       recurringExpense += amount;
          activeIds.add(rec.id);
          installmentsGenerated++;
        }

        const next = this.nextDate(cursor, rec.frequency);
        if (next.getTime() <= cursor.getTime()) break;
        cursor = next;
        count++;
      }
    });

    // Parcelas de empréstimo no período (tipo FIXED apenas; INTEREST usa installment_amount)
    let loanInstallments = 0;
    loans.forEach(loan => {
      if (loan.status === 'paid') return;
      if (loan.type === 'fixed') {
        const paid = Number(loan.paid_installments || 0);
        const total = Number(loan.total_installments || 0);
        for (let i = paid + 1; i <= total; i++) {
          const d = parseLocalDate(loan.start_date);
          d.setMonth(d.getMonth() + (i - 1));
          const dateStr = localDateStr(d);
          if (dateStr >= rangeStart && dateStr <= rangeEnd) {
            loanInstallments += Number(loan.installment_amount || 0);
          }
        }
      } else {
        // INTEREST: usa a parcela do mês seguinte como estimativa
        const now = new Date();
        const nextDue = new Date(now.getFullYear(), now.getMonth(), Number(loan.due_day || 1), 12);
        if (nextDue < now) nextDue.setMonth(nextDue.getMonth() + 1);
        const dateStr = localDateStr(nextDue);
        if (dateStr >= rangeStart && dateStr <= rangeEnd) {
          loanInstallments += Number(loan.installment_amount || 0);
        }
      }
    });

    const netStructuralBalance = recurringIncome - recurringExpense - loanInstallments;

    let structuralHealthStatus: 'positive' | 'warning' | 'negative' = 'positive';
    if (netStructuralBalance < 0) structuralHealthStatus = 'negative';
    else if (recurringIncome > 0 && netStructuralBalance < recurringIncome * 0.2) structuralHealthStatus = 'warning';

    return {
      recurringIncome,
      recurringExpense,
      loanInstallments,
      netStructuralBalance,
      activeRecurringCount: activeIds.size,
      structuralHealthStatus
    };
  }

  // ── Alertas ─────────────────────────────────────────────────────────────────

  private scanRisks(timeline: TimelinePoint[], events: ForecastEvent[]): ForecastAlert[] {
    const alerts: ForecastAlert[] = [];

    const negativePoint = timeline.find(p => p.balance < 0);
    if (negativePoint) {
      alerts.push({
        type: 'negative_balance',
        severity: 3,
        message: `Saldo projetado negativo em ${negativePoint.date}`,
        date: negativePoint.date
      });
    }

    const totalIncome = events.filter(e => e.direction === 'income').reduce((s, e) => s + e.amount, 0);
    const totalExpense = events.filter(e => e.direction === 'expense').reduce((s, e) => s + e.amount, 0);
    if (totalIncome > 0 && (totalExpense / totalIncome) > 0.8) {
      alerts.push({
        type: 'over_commitment',
        severity: 2,
        message: 'Atenção: Suas despesas projetadas consomem mais de 80% da receita prevista.'
      });
    }

    return alerts;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private nextDate(date: Date, frequency: string): Date {
    const d = new Date(date);
    switch (frequency) {
      case 'Diário': d.setDate(d.getDate() + 1); break;
      case 'Semanal': d.setDate(d.getDate() + 7); break;
      case 'Mensal': d.setMonth(d.getMonth() + 1); break;
      case 'Anual': d.setFullYear(d.getFullYear() + 1); break;
      default: d.setMonth(d.getMonth() + 1); break;
    }
    return d;
  }

  // ── Fetchers ────────────────────────────────────────────────────────────────

  private async fetchTransactions(): Promise<SupabaseTransaction[]> {
    const user = await this.supabase.getUser();
    if (!user) return [];
    const { data } = await this.supabase.client
      .from('transactions')
      .select('*')
      .neq('status', 'cancelled');
    this._cachedTransactions = data || [];
    return this._cachedTransactions;
  }

  private async fetchRecurring() {
    const { data } = await this.supabase.client
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .eq('is_archived', false);
    return data || [];
  }

  private async fetchLoans(): Promise<SupabaseLoan[]> {
    const { data } = await this.supabase.client.from('loans').select('*').neq('status', 'paid');
    return data || [];
  }

  private async fetchAccounts(): Promise<SupabaseAccount[]> {
    const { data } = await this.supabase.client.from('accounts').select('*');
    return data || [];
  }

  private async fetchCardTransactions(): Promise<SupabaseCardTransaction[]> {
    const { data } = await this.supabase.client
      .from('credit_card_transactions')
      .select('*')
      .neq('status', 'cancelled');
    return data || [];
  }
}
