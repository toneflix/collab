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

      <div class="flex justify-center mb-6" v-if="periods.length > 1">
        <q-btn-toggle
          rounded
          unelevated
          no-caps
          toggle-color="toneflix"
          color="grey-10"
          text-color="grey-4"
          class="!flex-none border border-gray-700"
          v-model="selectedPeriod"
          :options="periods.map((p) => ({ label: p.label, value: p.key, slot: p.key }))"
        >
          <template :key="p.key" v-slot:[p.key] v-for="p in periods">
            <q-badge
              rounded
              color="green-8"
              class="ml-2"
              :label="`Save up to ${bestDiscount(p.key)}%`"
              v-if="bestDiscount(p.key) > 0"
            />
          </template>
        </q-btn-toggle>
      </div>

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <q-card
          flat
          bordered
          :key="plan.id"
          class="flex flex-col bg-dark"
          :class="{ 'border-amber-7!': plan.id === current?.id }"
          v-for="{ plan, option } in shownPlans"
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
              <q-badge
                rounded
                color="green-8"
                class="!flex-none"
                :label="`Save ${option.discount}%`"
                v-if="option.discount > 0"
              />
            </div>
            <div class="mt-2 text-3xl font-bold">
              {{ price(option.price) }}
              <span class="text-sm font-normal text-grey-5">
                / {{ periodText }}
              </span>
            </div>
            <div class="mt-1 text-xs text-grey-5" v-if="option.cycles > 1">
              {{ price(option.perCycle) }} / {{ period(plan) }}
              <span class="text-green-5" v-if="option.saved > 0">
                · you save {{ price(option.saved) }}
              </span>
            </div>
            <div class="mt-2 text-xs text-grey-5" v-if="plan.description">
              {{ plan.description }}
            </div>
          </q-card-section>
          <q-card-actions class="mt-auto !flex-none">
            <PayButton
              unelevated
              rounded
              class="w-full"
              color="toneflix"
              :label="
                plan.id === current?.id
                  ? `Add ${periodText}`
                  : `Get ${plan.name}`
              "
              :amount="option.price"
              :body="{ purpose: 'premium', plan: plan.slug, cycles: option.cycles }"
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
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { date as qdate, useMeta } from 'quasar';
import { useRequest } from 'alova/client';
import { invalidateCache } from 'src/boot/alova';
import PayButton from 'src/components/Payments/PayButton.vue';
import { usePayments } from 'src/composables/usePayments';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { refreshUser } from 'src/utils/proccessor';
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

const periods = computed(() => data.value?.periods || []);

// The billing period picked in the tabs; plans that can't be paid for that long are hidden.
const selectedPeriod = ref<string>('');
watch(periods, (list) => {
  if (!list.some((p) => p.key === selectedPeriod.value)) selectedPeriod.value = list[0]?.key || '';
}, { immediate: true });

// The picked period as text, e.g. "month", "6 months" or "year".
const periodText = computed(() => {
  const p = periods.value.find((p) => p.key === selectedPeriod.value);
  return !p ? '' : p.count > 1 ? `${p.count} ${p.interval}s` : p.interval;
});

/**
 * The paid plans offering the picked period, each with its option for it.
 */
const shownPlans = computed(() =>
  paidPlans.value.flatMap((plan) => {
    const option = plan.billingOptions.find((o) => o.period === selectedPeriod.value);
    return option ? [{ plan, option }] : [];
  }),
);

/**
 * The biggest discount any plan gives for a period.
 */
const bestDiscount = (key: string) =>
  Math.max(0, ...paidPlans.value.flatMap((p) => p.billingOptions.filter((o) => o.period === key).map((o) => o.discount)));

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
