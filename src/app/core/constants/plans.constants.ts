export enum PlanCode {
  BASIC = 'basic',
  PRO = 'pro',
  MASTER = 'master',
  FAMILY = 'family'
}

export const PLAN_PRICE_IDS: Record<Exclude<PlanCode, PlanCode.BASIC>, string> = {
  [PlanCode.PRO]: 'price_1TFeUxKEGcZcVMwNTnqgIusz',
  [PlanCode.MASTER]: 'price_1TFeVfKEGcZcVMwNAHVc9yiP',
  [PlanCode.FAMILY]: 'price_1TFeW5KEGcZcVMwNw7xxTHXv'
};

export const PLAN_FEATURES: Record<PlanCode, string[]> = {
  [PlanCode.BASIC]: ['accounts:2', 'cards:1'],
  [PlanCode.PRO]: ['accounts:5', 'cards:3', 'transfers:true'],
  [PlanCode.MASTER]: ['accounts:unlimited', 'cards:unlimited', 'transfers:true', 'goals:true'],
  [PlanCode.FAMILY]: [
    'accounts:unlimited',
    'cards:unlimited',
    'transfers:true',
    'goals:true',
    'loans:true',
    'investments:true',
    'shared_accounts:true'
  ]
};
