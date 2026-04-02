import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { ImportItem, ImportStatus, ColumnMapping } from '../models/import.interface';

@Injectable({
  providedIn: 'root'
})
export class ImportParserService {
  constructor() {}

  async parseExcelFile(file: File): Promise<ImportItem[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            resolve([]);
            return;
          }

          const mapping = this.identifyColumns(Object.keys(jsonData[0] as object));
          const items = jsonData.map((row: any, index: number) => this.mapRowToImportItem(row, mapping, index));

          resolve(items);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  private identifyColumns(headers: string[]): ColumnMapping {
    const mapping: Partial<ColumnMapping> = {};

    headers.forEach(header => {
      const h = header.toLowerCase().trim();

      // Data
      if (['data', 'date', 'data da transação', 'dia'].includes(h)) {
        mapping.date = header;
      }
      // Descrição
      else if (['descrição', 'descriçao', 'descricao', 'description', 'histórico', 'estabelecimento'].includes(h)) {
        mapping.description = header;
      }
      // Valor
      else if (['valor', 'amount', 'preço', 'total', 'quantia'].includes(h)) {
        mapping.amount = header;
      }
      // Categoria
      else if (['categoria', 'category', 'tipo de gasto'].includes(h)) {
        mapping.category = header;
      }
      // Tipo (Renda/Despesa)
      else if (['tipo', 'type', 'movimentação'].includes(h)) {
        mapping.type = header;
      }
    });

    return mapping as ColumnMapping;
  }

  private mapRowToImportItem(row: any, mapping: ColumnMapping, index: number): ImportItem {
    const dateValue = mapping.date ? row[mapping.date] : null;
    const description = mapping.description ? (row[mapping.description] || 'Sem descrição') : 'Sem descrição';
    const amount = mapping.amount ? this.parseAmount(row[mapping.amount]) : NaN;
    const category = this.suggestCategory(description, mapping.category ? row[mapping.category] : undefined);
    const typeValue = mapping.type ? row[mapping.type] : undefined;
    const type = this.identifyType(typeValue, amount);

    const errors: string[] = [];
    if (!dateValue) errors.push('Data ausente');
    if (isNaN(amount)) errors.push('Valor inválido');

    return {
      id: `import-${Date.now()}-${index}`,
      date: this.formatDate(dateValue),
      description,
      amount: Math.abs(amount),
      category,
      type,
      status: errors.length > 0 ? ImportStatus.INVALID : (category ? ImportStatus.VALID : ImportStatus.WARNING),
      errors,
      selected: errors.length === 0,
      raw: row
    };
  }

  private parseAmount(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return NaN;
    // Tenta limpar strings como "R$ 1.234,56"
    const cleaned = value.toString()
      .replace('R$', '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    return parseFloat(cleaned);
  }

  private identifyType(typeValue: any, amount: number): 'income' | 'expense' {
    if (typeValue) {
      const t = typeValue.toString().toLowerCase();
      if (['receita', 'renda', 'entrada', 'income', 'ganho'].includes(t)) return 'income';
      if (['despesa', 'saída', 'expense', 'gasto', 'pagamento'].includes(t)) return 'expense';
    }
    // Heurística baseada no sinal do valor se o tipo não for explícito
    return amount >= 0 ? 'income' : 'expense';
  }

  private suggestCategory(description: string, existingCategory?: string): string {
    if (existingCategory) return existingCategory.trim();

    const desc = description.toLowerCase();
    
    // Alimentação
    if (this.matches(desc, ['ifood', 'restaurante', 'mcdonalds', 'burguer king', 'padaria', 'mercado', 'supermercado', 'açougue'])) return 'Alimentação';
    
    // Transporte
    if (this.matches(desc, ['uber', '99app', 'posto', 'gasolina', 'combustivel', 'pedagio', 'estacionamento'])) return 'Transporte';
    
    // Lazer
    if (this.matches(desc, ['netflix', 'spotify', 'cinema', 'show', 'steam', 'playstation', 'xbox'])) return 'Lazer';
    
    // Saúde
    if (this.matches(desc, ['farmacia', 'drogaria', 'hospital', 'consulta', 'exame', 'dentista'])) return 'Saúde';
    
    // Contas Fixas
    if (this.matches(desc, ['aluguel', 'condominio', 'luz', 'energia', 'agua', 'internet', 'celular', 'telefone'])) return 'Contas Fixas';

    return '';
  }

  private matches(text: string, keywords: string[]): boolean {
    return keywords.some(k => text.includes(k));
  }

  private formatDate(value: any): string {
    if (value instanceof Date) return value.toISOString().split('T')[0];
    if (typeof value === 'string') {
      // Tenta parsing básico de DD/MM/YYYY
      const parts = value.split('/');
      if (parts.length === 3) {
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2];
        return `${y}-${m}-${d}`;
      }
    }
    return '';
  }
}
