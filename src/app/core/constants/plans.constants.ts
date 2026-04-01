export enum PlanCode {
  BASIC = 'basic',
  PRO = 'pro',
  MASTER = 'master',
  ULTRA = 'ultra',
  FAMILY = 'family'
}

export const PLAN_PRICE_IDS: Record<Exclude<PlanCode, PlanCode.BASIC>, string> = {
  [PlanCode.PRO]: 'price_1TFeUxKEGcZcVMwNTnqgIusz',
  [PlanCode.MASTER]: 'price_1TFeVfKEGcZcVMwNAHVc9yiP',
  [PlanCode.ULTRA]: 'price_ultra_id_placeholder', // Adicionar ID real se necessário
  [PlanCode.FAMILY]: 'price_1TFeW5KEGcZcVMwNw7xxTHXv'
};

export const PLAN_FEATURES: Record<PlanCode, string[]> = {
  [PlanCode.BASIC]: ['accounts:2', 'cards:1'],
  [PlanCode.PRO]: ['accounts:5', 'cards:3', 'account_transfers'],
  [PlanCode.MASTER]: ['accounts:unlimited', 'cards:unlimited', 'account_transfers', 'goals', 'bulk_import'],
  [PlanCode.ULTRA]: ['accounts:unlimited', 'cards:unlimited', 'account_transfers', 'goals', 'loans', 'investments', 'bulk_import'],
  [PlanCode.FAMILY]: [
    'accounts:unlimited',
    'cards:unlimited',
    'account_transfers',
    'goals',
    'loans',
    'investments',
    'shared_accounts',
    'bulk_import'
  ]
};
