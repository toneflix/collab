<template>
  <q-page padding>
    <div class="max-w-4xl mx-auto">
      <div class="py-6 text-center">
        <q-icon name="fas fa-crown" color="amber-7" size="40px" />
        <h1 class="mt-3 text-4xl font-circlular-std">Toneflix Premium</h1>
        <p class="mt-2 text-grey-5">
          Pick the plan that fits how you listen and create.
        </p>
        <q-spinner class="mt-3" v-if="loading" />
        <q-chip
          icon="fas fa-check"
          color="green-9"
          text-color="white"
          class="mt-3"
          v-if="status?.premium"
        >
          You're on {{ status.plan.name }} until {{ date(status.endsAt) }}
        </q-chip>
      </div>

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <q-card
          flat
          bordered
          :key="plan.id"
          class="bg-dark"
          :class="{ 'border-amber-7!': plan.id === current?.id }"
          v-for="plan in paidPlans"
        >
          <q-card-section>
            <div class="flex items-center gap-2">
              <div class="text-lg font-bold">{{ plan.name }}</div>
              <q-badge
                rounded
                color="amber-8"
                label="Your plan"
                class="!flex-none"
                v-if="plan.id === current?.id"
              />
            </div>
            <div class="mt-1 text-3xl font-bold">
              {{ price(plan.price) }}
              <span class="text-sm font-normal text-grey-5">
                / {{ period(plan) }}
              </span>
            </div>
            <div class="mt-1 text-xs text-grey-5" v-if="plan.description">
              {{ plan.description }}
            </div>
            <div class="mt-1 text-xs text-green-5" v-if="saving(plan)">
              Save {{ saving(plan) }}% compared to paying monthly
            </div>
          </q-card-section>
          <q-card-actions>
            <PayButton
              unelevated
              rounded
              class="w-full"
              color="toneflix"
              :label="plan.id === current?.id ? `Add a ${period(plan)}` : `Get ${plan.name}`"
              :amount="plan.price"
              :body="{ purpose: 'premium', plan: plan.slug }"
              @paid="onPaid"
            />
          </q-card-actions>
        </q-card>
      </div>

      <div class="mt-8 overflow-x-auto" v-if="data">
        <q-markup-table flat dark class="bg-transparent">
          <thead>
            <tr>
              <th class="text-left"></th>
              <th
                class="text-center"
                :key="plan.id"
                :class="{ 'text-amber-7': !plan.isDefault }"
                v-for="plan in data.plans"
              >
                {{ plan.name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr :key="feature.key" v-for="feature in data.features">
              <td>
                <div>{{ feature.title }}</div>
                <div class="text-xs text-grey-6">{{ feature.description }}</div>
              </td>
              <td class="text-center" :key="plan.id" v-for="plan in data.plans">
                <template v-if="feature.type === 'toggle'">
                  <q-icon
                    name="fas fa-check"
                    color="green-5"
                    v-if="plan.features[feature.key]"
                  />
                  <q-icon name="fas fa-xmark" color="grey-6" v-else />
                </template>
                <template v-else>
                  {{ limit(Number(plan.features[feature.key] || 0), feature.unit ? ` ${feature.unit}` : '') }}
                </template>
              </td>
            </tr>
          </tbody>
        </q-markup-table>
      </div>
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
import { Plan } from 'src/utils/models';
import { loadPlansRequest } from 'src/utils/requests/plans';
import { loadSubscriptionRequest } from 'src/utils/requests/payments';

const router = useRouter();
const boot = useBootstrapStore();
const { price, limit, period } = usePayments();

// The plans are public; which one you're on needs an account.
const { data, loading, send: reloadPlans } = useRequest(loadPlansRequest);
const { data: status, send: reloadStatus } = useRequest(loadSubscriptionRequest, {
  immediate: !!boot.user.id,
});

const current = computed(() => data.value?.current);
const paidPlans = computed(() => (data.value?.plans || []).filter((p) => p.price > 0));

/**
 * How much a longer plan saves over the cheapest monthly plan.
 */
const saving = (plan: Plan) => {
  const monthly = paidPlans.value.find((p) => p.interval === 'month' && p.intervalCount === 1);
  const months = plan.interval === 'year' ? plan.intervalCount * 12 : plan.interval === 'month' ? plan.intervalCount : 0;
  if (!monthly || monthly.id === plan.id || months <= 1) return 0;
  const percent = Math.round(100 - (plan.price / (monthly.price * months)) * 100);
  return percent > 0 ? percent : 0;
};

const date = (value?: string | null) =>
  value ? qdate.formatDate(value, 'MMM D, YYYY') : '';

const onPaid = async () => {
  await invalidateCache();
  await refreshUser(router);
  reloadPlans();
  reloadStatus();
};

useMeta(() => ({
  title: 'Premium',
  titleTemplate: (title) => `${title} - Toneflix Collab`,
}));
</script>
