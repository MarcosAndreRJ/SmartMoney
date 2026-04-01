export enum ImportType {
  TRANSACTION = 'transaction',
  CARD = 'card'
}

export enum ImportStatus {
  VALID = 'valid',
  WARNING = 'warning',
  INVALID = 'invalid'
}

export interface ImportItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  accountId?: string;
  cardId?: string;
  status: ImportStatus;
  errors: string[];
  selected: boolean;
  raw?: any; // Dados originais da linha do Excel
}

export interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  category?: string;
  type?: string;
  account?: string;
}

export interface ImportPreview {
  items: ImportItem[];
  summary: {
    totalItems: number;
    validItems: number;
    invalidItems: number;
    totalAmount: number;
    selectedAmount: number;
  };
}
