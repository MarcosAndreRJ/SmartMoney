import { Injectable, inject } from '@angular/core';
import { PLAN_FEATURES, PlanCode } from '../constants/plans.constants';
import { BillingService } from './billing.service';

@Injectable({ providedIn: 'root' })
export class FeatureAccessService {
  private billingService = inject(BillingService);

  async hasFeature(featureKey: string): Promise<boolean> {
    // 1. Tentar verificação dinâmica via assinatura do banco de dados
    try {
      const { resources } = await this.billingService.getUserPlan();
      if (resources) {
        // Verifica se a chave existe e é verdadeira no objeto resources
        if (resources[featureKey] === true) {
          return true;
        }
      }
    } catch (e) {
      console.warn('Erro ao verificar recursos dinâmicos, usando fallback estático', e);
    }

    // 2. Fallback para verificação estática baseada no ID do plano
    const activePlan = await this.billingService.getCurrentPlan();
    
    // Suporte a mapeamento de chaves legadas se necessário
    let searchKey = featureKey;
    if (featureKey === 'import_excel') searchKey = 'bulk_import';

    return PLAN_FEATURES[activePlan as PlanCode]?.includes(searchKey) ?? false;
  }
}
