import { Injectable, inject } from '@angular/core';
import { PLAN_FEATURES, PlanCode } from '../constants/plans.constants';
import { BillingService } from './billing.service';

@Injectable({ providedIn: 'root' })
export class FeatureAccessService {
  private billingService = inject(BillingService);

  async hasFeature(featureKey: string): Promise<boolean> {
    const activePlan = await this.billingService.getCurrentPlan();
    return PLAN_FEATURES[activePlan as PlanCode]?.includes(featureKey) ?? false;
  }
}
