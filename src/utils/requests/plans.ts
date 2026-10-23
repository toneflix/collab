import { Plan, PlanFeature, PlansResponse, ResponseBody } from '../models'

import { alova } from 'src/boot/alova'

export type PlanForm = {
  name: string;
  slug?: string;
  description?: string | null;
  price: number;
  interval: Plan['interval'];
  interval_count: number;
  billing_options: { cycles: number; discount: number }[];
  features: Record<string, boolean | number>;
  is_default: boolean;
  active: boolean;
  sort: number;
}

/**
 * The plans on offer, the feature catalogue and the viewer's current plan.
 */
export const loadPlansRequest = () => {
  return alova.Get('plans', {
    transform: (e: ResponseBody<PlansResponse>) => e.data,
    cacheFor: 0,
  })
}

/**
 * Every plan, including inactive ones (needs the manage-plans permission).
 */
export const loadAdminPlansRequest = () => {
  return alova.Get('admin/plans', {
    transform: (e: ResponseBody<Plan[]>) => e.data,
    cacheFor: 0,
  })
}

export const loadPlanFeaturesRequest = () => {
  return alova.Get('admin/plans/features', {
    transform: (e: ResponseBody<PlanFeature[]>) => e.data,
  })
}

export const savePlanRequest = (form: PlanForm, id?: number) => {
  return id
    ? alova.Put<ResponseBody<Plan>>(`admin/plans/${id}`, form)
    : alova.Post<ResponseBody<Plan>>('admin/plans', form)
}

export const deletePlanRequest = (id: number) => {
  return alova.Delete<ResponseBody<Plan | []>>(`admin/plans/${id}`)
}
