import { computed } from 'vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { Plan } from 'src/utils/models';

/**
 * Helpers for showing prices in the app's currency.
 */
export const usePayments = () => {
  const boot = useBootstrapStore();

  const currency = computed(() => boot.configuration.app_currency || 'NGN');

  /**
   * The currency's symbol, e.g. ₦ or $, for input prefixes.
   */
  const symbol = computed(() => {
    try {
      return (
        new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: currency.value,
          currencyDisplay: 'narrowSymbol',
        })
          .formatToParts(0)
          .find((p) => p.type === 'currency')?.value || currency.value
      );
    } catch {
      return currency.value;
    }
  });

  /**
   * Format an amount as money, e.g. ₦1,500 or $12.50.
   */
  const price = (amount?: number | string | null) => {
    const value = Number(amount || 0);
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency.value,
        maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
      }).format(value);
    } catch {
      return `${currency.value} ${value.toLocaleString()}`;
    }
  };

  /**
   * Show a limit, where 0 means there is no limit.
   */
  const limit = (value: number, unit = '') => (value > 0 ? `${value}${unit}` : 'Unlimited');

  const isPremium = computed(() => !!boot.user.isPremium);

  /**
   * How long one payment on a plan lasts, e.g. "month" or "3 months".
   */
  const period = (plan: Pick<Plan, 'interval' | 'intervalCount'>) =>
    plan.intervalCount > 1 ? `${plan.intervalCount} ${plan.interval}s` : plan.interval;

  return { currency, symbol, price, limit, isPremium, period };
};
