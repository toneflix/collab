<template>
  <q-page padding>
    <div class="max-w-3xl mx-auto">
      <div class="py-6 text-center">
        <q-icon name="fas fa-crown" color="amber-7" size="40px" />
        <h1 class="mt-3 text-4xl font-circlular-std">Toneflix Premium</h1>
        <p class="mt-2 text-grey-5">
          Download music for offline listening, wear the Premium badge, and get
          more room to create.
        </p>
        <q-spinner class="mt-3" v-if="loading" />
        <q-chip
          icon="fas fa-check"
          color="green-9"
          text-color="white"
          class="mt-3"
          v-if="status.premium"
        >
          You're Premium until {{ date(status.endsAt) }}
        </q-chip>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <q-card
          flat
          bordered
          :key="plan.key"
          class="bg-dark"
          v-for="plan in plans"
        >
          <q-card-section>
            <div class="text-lg font-bold">{{ plan.title }}</div>
            <div class="mt-1 text-3xl font-bold">
              {{ price(plan.amount) }}
              <span class="text-sm font-normal text-grey-5">
                / {{ plan.per }}
              </span>
            </div>
            <div class="mt-1 text-xs text-grey-5" v-if="plan.note">
              {{ plan.note }}
            </div>
          </q-card-section>
          <q-card-actions>
            <PayButton
              unelevated
              rounded
              class="w-full"
              color="toneflix"
              :disable="!plan.amount"
              :label="status.premium ? `Add a ${plan.per}` : `Get ${plan.title}`"
              :amount="plan.amount"
              :body="{ purpose: 'premium', plan: plan.key }"
              @paid="onPaid"
            />
          </q-card-actions>
        </q-card>
      </div>

      <q-markup-table flat dark class="mt-8 bg-transparent">
        <thead>
          <tr>
            <th class="text-left"></th>
            <th class="text-center">Free</th>
            <th class="text-center text-amber-7">Premium</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Download tracks for offline listening</td>
            <td class="text-center">
              <q-icon name="fas fa-xmark" color="grey-6" />
            </td>
            <td class="text-center">
              <q-icon name="fas fa-check" color="green-5" />
            </td>
          </tr>
          <tr>
            <td>Premium badge on your profile</td>
            <td class="text-center">
              <q-icon name="fas fa-xmark" color="grey-6" />
            </td>
            <td class="text-center">
              <q-icon name="fas fa-check" color="green-5" />
            </td>
          </tr>
          <tr>
            <td>Projects</td>
            <td class="text-center">{{ limit(status.limits.free.projects) }}</td>
            <td class="text-center">
              {{ limit(status.limits.premium.projects) }}
            </td>
          </tr>
          <tr>
            <td>Collaborators per project</td>
            <td class="text-center">
              {{ limit(status.limits.free.collaborators) }}
            </td>
            <td class="text-center">
              {{ limit(status.limits.premium.collaborators) }}
            </td>
          </tr>
          <tr>
            <td>Largest stem upload</td>
            <td class="text-center">
              {{ limit(status.limits.free.stemSize, ' MB') }}
            </td>
            <td class="text-center">
              {{ limit(status.limits.premium.stemSize, ' MB') }}
            </td>
          </tr>
        </tbody>
      </q-markup-table>

    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { date as qdate, useMeta } from 'quasar';
import { useRequest } from 'alova/client';
import { invalidateCache } from 'src/boot/alova';
import PayButton from 'src/components/Payments/PayButton.vue';
import { usePayments } from 'src/composables/usePayments';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { refreshUser } from 'src/utils/proccessor';
import { AccountLimits, PremiumStatus } from 'src/utils/models';
import { loadSubscriptionRequest } from 'src/utils/requests/payments';

const router = useRouter();
const boot = useBootstrapStore();
const { price, limit } = usePayments();

// Prices and limits are public settings; whether you're Premium needs an account.
const {
  data: subscription,
  loading,
  send: reload,
} = useRequest(loadSubscriptionRequest, {
  immediate: !!boot.user.id,
});

const tierLimits = (tier: 'free' | 'premium'): AccountLimits => ({
  projects: Number(boot.configuration[`${tier}_max_projects`] || 0),
  collaborators: Number(boot.configuration[`${tier}_max_collaborators`] || 0),
  stemSize: Number(boot.configuration[`${tier}_max_stem_size`] || 0),
});

const status = computed<PremiumStatus>(
  () =>
    subscription.value || {
      premium: false,
      plans: {
        monthly: Number(boot.configuration.premium_monthly_price || 0),
        yearly: Number(boot.configuration.premium_yearly_price || 0),
      },
      currency: boot.configuration.app_currency,
      limits: { free: tierLimits('free'), premium: tierLimits('premium') },
    },
);

const plans = computed(() => {
  const monthly = status.value.plans.monthly;
  const yearly = status.value.plans.yearly;
  const saving = monthly ? Math.round(100 - (yearly / (monthly * 12)) * 100) : 0;

  return [
    { key: 'monthly' as const, title: 'Monthly', per: 'month', amount: monthly, note: '' },
    {
      key: 'yearly' as const,
      title: 'Yearly',
      per: 'year',
      amount: yearly,
      note: saving > 0 ? `Save ${saving}% compared to paying monthly` : '',
    },
  ];
});

const date = (value?: string | null) =>
  value ? qdate.formatDate(value, 'MMM D, YYYY') : '';

const onPaid = async () => {
  await invalidateCache();
  await refreshUser(router);
  reload();
};

useMeta(() => ({
  title: 'Premium',
  titleTemplate: (title) => `${title} - Toneflix Collab`,
}));
</script>
