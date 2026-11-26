import { computed } from 'vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { Plan, PlanFeature, Track } from 'src/utils/models';

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
  const limit = (value: number, unit = '') =>
    value > 0 ? `${value}${unit}` : 'Unlimited';

  /**
   * Show a plan's limit or monthly credits for a feature.
   */
  const featureValue = (
    feature: Pick<PlanFeature, 'type' | 'unit'>,
    value: number,
  ) =>
    feature.type === 'credits'
      ? value > 0
        ? `${value.toLocaleString()} a month`
        : 'None'
      : limit(value, feature.unit ? ` ${feature.unit}` : '');

  const isPremium = computed(() => !!boot.user.isPremium);

  /**
   * Whether the viewer can download a track now: anyone when its creator
   * opened downloads, owners and buyers always, and listeners with downloads
   * in their plan when its creator allowed downloads.
   */
  const canDownload = (track: Track) =>
    !!track.downloadable &&
    !track.locked &&
    (!!track.freeDownload ||
      !!(boot.user.canDownload ?? isPremium.value) ||
      !!track.owned ||
      Number(track.price) > 0);

  /**
   * How long a payment on a plan lasts, e.g. "month", "3 months", or "6 months"
   * when paying for 6 cycles at once.
   */
  const period = (
    plan: Pick<Plan, 'interval' | 'intervalCount'>,
    cycles = 1,
  ) => {
    const count = Math.max(1, plan.intervalCount || 1) * Math.max(1, cycles);
    return count > 1 ? `${count} ${plan.interval}s` : plan.interval;
  };

  /**
   * A short name for a billing option, e.g. "Monthly", "6 months" or "Annual".
   */
  const billingLabel = (
    plan: Pick<Plan, 'interval' | 'intervalCount'>,
    cycles = 1,
  ) => {
    const count = Math.max(1, plan.intervalCount || 1) * Math.max(1, cycles);
    const months =
      plan.interval === 'month'
        ? count
        : plan.interval === 'year'
          ? count * 12
          : 0;
    if (months === 12) return 'Annual';
    if (count === 1) {
      return { day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Yearly' }[
        plan.interval
      ];
    }
    return `${count} ${plan.interval}s`;
  };

  return {
    currency,
    symbol,
    price,
    limit,
    featureValue,
    isPremium,
    canDownload,
    period,
    billingLabel,
  };
};
