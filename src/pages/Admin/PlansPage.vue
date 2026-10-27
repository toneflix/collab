<template>
  <q-page padding>
    <div class="max-w-5xl mx-auto">
      <div class="flex items-center justify-between gap-3 py-8">
        <div>
          <h1 class="text-3xl font-circlular-std">Plans</h1>
          <p class="text-grey-5">
            Create plans and choose what each one grants or limits.
          </p>
        </div>
        <q-btn
          unelevated
          rounded
          no-caps
          class="flex-none!"
          color="toneflix"
          icon="lucide-plus"
          label="New plan"
          @click="edit()"
        />
      </div>

      <BlockSkeleton variant="stats" :count="3" v-if="loading" />

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <q-card
          flat
          bordered
          class="bg-dark"
          :class="{ 'opacity-60': !plan.active }"
          :key="plan.id"
          v-for="plan in plans"
        >
          <q-card-section>
            <div class="flex items-center gap-2">
              <div class="text-lg font-bold">{{ plan.name }}</div>
              <q-badge
                rounded
                color="green-9"
                label="Default"
                class="flex-none!"
                v-if="plan.isDefault"
              />
              <q-badge
                rounded
                color="grey-8"
                label="Inactive"
                class="flex-none!"
                v-if="!plan.active"
              />
            </div>
            <div class="text-xs text-grey-6">{{ plan.slug }}</div>
            <div class="mt-1 text-2xl font-bold">
              {{ plan.price > 0 ? price(plan.price) : 'Free' }}
              <span
                class="text-sm font-normal text-grey-5"
                v-if="plan.price > 0"
              >
                / {{ period(plan) }}
              </span>
            </div>
            <div
              class="flex gap-1 mt-1"
              v-if="plan.price > 0 && plan.billingOptions.length > 1"
            >
              <q-badge
                outline
                color="green-5"
                class="flex-none!"
                :key="option.cycles"
                :label="`${billingLabel(plan, option.cycles)} -${option.discount}%`"
                v-for="option in plan.billingOptions.slice(1)"
              />
            </div>
            <div class="mt-1 text-xs text-grey-5">
              {{ plan.subscribers || 0 }} active subscriber{{
                plan.subscribers === 1 ? '' : 's'
              }}
            </div>
          </q-card-section>
          <q-card-section class="pt-0">
            <div
              class="flex items-center justify-between py-1 text-sm"
              :key="feature.key"
              v-for="feature in features"
            >
              <span class="text-grey-4">{{ feature.title }}</span>
              <span class="flex-none!">
                <template v-if="feature.type === 'toggle'">
                  <q-icon
                    name="lucide-check"
                    color="green-5"
                    v-if="plan.features[feature.key]"
                  />
                  <q-icon name="lucide-x" color="grey-6" v-else />
                </template>
                <template v-else>
                  {{
                    featureValue(
                      feature,
                      Number(plan.features[feature.key] || 0),
                    )
                  }}
                </template>
              </span>
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn
              flat
              no-caps
              color="red-5"
              label="Delete"
              v-if="!plan.isDefault"
              @click="remove(plan)"
            />
            <q-btn flat no-caps label="Edit" @click="edit(plan)" />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="editing">
      <q-card class="w-full max-w-xl bg-dark">
        <q-card-section class="text-lg font-bold">
          {{ form.id ? `Edit ${form.name}` : 'New plan' }}
        </q-card-section>

        <q-card-section class="pt-0 grid gap-3 md:grid-cols-2">
          <q-input
            dark
            filled
            dense
            label="Name"
            hide-bottom-space
            v-model="form.name"
            :error="!!errors.name"
            :error-message="errors.name"
          />
          <q-input
            dark
            filled
            dense
            label="Slug (optional)"
            hide-bottom-space
            v-model="form.slug"
            :error="!!errors.slug"
            :error-message="errors.slug"
          />
          <q-input
            dark
            filled
            dense
            autogrow
            class="md:col-span-2"
            label="Description"
            v-model="form.description"
          />
          <q-input
            dark
            filled
            dense
            type="number"
            label="Price (0 makes it free)"
            hide-bottom-space
            v-model.number="form.price"
            :prefix="symbol"
            :error="!!errors.price"
            :error-message="errors.price"
          />
          <div class="flex gap-2 no-wrap">
            <q-input
              dark
              filled
              dense
              type="number"
              label="Every"
              class="w-20 flex-none!"
              v-model.number="form.interval_count"
              :min="1"
            />
            <q-select
              dark
              filled
              dense
              emit-value
              map-options
              label="Period"
              v-model="form.interval"
              :options="intervals"
              :error="!!errors.interval"
              :error-message="errors.interval"
            />
          </div>
          <div class="md:col-span-2">
            <div class="flex items-center justify-between">
              <div class="font-bold">Bulk billing</div>
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                icon="lucide-plus"
                label="Add option"
                class="flex-none!"
                @click="
                  form.billing_options.push({
                    cycles: nextCycles(),
                    discount: 0,
                  })
                "
              />
            </div>
            <div class="text-xs text-grey-6">
              Let people pay for several {{ form.interval }}s at once, with a
              discount.
            </div>
            <div
              class="flex items-start gap-2 mt-2 no-wrap"
              :key="i"
              v-for="(option, i) in form.billing_options"
            >
              <q-input
                dark
                filled
                dense
                hide-bottom-space
                type="number"
                class="w-36 flex-none!"
                :label="`Number of ${form.interval}s`"
                v-model.number="option.cycles"
                :min="2"
                :error="!!errors[`billing_options.${i}.cycles`]"
                :error-message="errors[`billing_options.${i}.cycles`]"
              />
              <q-input
                dark
                filled
                dense
                hide-bottom-space
                type="number"
                class="w-36 flex-none!"
                label="Discount"
                suffix="%"
                v-model.number="option.discount"
                :min="0"
                :max="100"
                :error="!!errors[`billing_options.${i}.discount`]"
                :error-message="errors[`billing_options.${i}.discount`]"
              />
              <div class="pt-2 text-sm text-grey-5">
                {{ price(optionPrice(option)) }} for
                {{
                  period(
                    {
                      interval: form.interval,
                      intervalCount: form.interval_count,
                    },
                    option.cycles,
                  )
                }}
              </div>
              <IconBtn size="sm"
                icon="lucide-x"
                class="mt-1 flex-none!"
                @click="form.billing_options.splice(i, 1)"
              />
            </div>
          </div>
          <q-input
            dark
            filled
            dense
            type="number"
            label="Order (lower shows first)"
            v-model.number="form.sort"
          />
          <div class="flex flex-col">
            <q-toggle
              dark
              label="Active"
              v-model="form.active"
              :disable="form.is_default"
            />
            <q-toggle
              dark
              label="Default plan"
              v-model="form.is_default"
              :disable="!!editingPlan?.isDefault"
            />
            <div
              class="text-xs text-negative"
              v-if="errors.is_default || errors.active"
            >
              {{ errors.is_default || errors.active }}
            </div>
          </div>
        </q-card-section>

        <q-separator dark />

        <q-card-section>
          <div class="mb-2 font-bold">Features</div>
          <div
            class="flex items-center justify-between gap-3 py-2 no-wrap"
            :key="feature.key"
            v-for="feature in features"
          >
            <div>
              <div>{{ feature.title }}</div>
              <div class="text-xs text-grey-6">
                {{ feature.description }}
                <template v-if="feature.type === 'limit'"
                  >0 means no limit.</template
                >
                <template v-if="feature.type === 'credits'"
                  >Given each month. 0 means none.</template
                >
              </div>
            </div>
            <q-toggle
              dark
              class="flex-none!"
              v-model="form.features[feature.key]"
              v-if="feature.type === 'toggle'"
            />
            <q-input
              dark
              filled
              dense
              type="number"
              class="w-28 flex-none!"
              :suffix="feature.unit || undefined"
              :min="0"
              :model-value="Number(form.features[feature.key] || 0)"
              @update:model-value="
                (v) => (form.features[feature.key] = Number(v || 0))
              "
              v-else
            />
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn
            unelevated
            rounded
            no-caps
            color="toneflix"
            label="Save"
            :loading="saving"
            @click="save"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMeta, useQuasar } from 'quasar';
import { useRequest } from 'alova/client';
import { usePayments } from 'src/composables/usePayments';
import { notify } from 'src/utils/helpers';
import { Plan, ResponseBody } from 'src/utils/models';
import {
  PlanForm,
  deletePlanRequest,
  loadAdminPlansRequest,
  loadPlanFeaturesRequest,
  savePlanRequest,
} from 'src/utils/requests/plans';
import BlockSkeleton from 'src/components/Skeletons/BlockSkeleton.vue';

const $q = useQuasar();
const { price, featureValue, period, symbol, billingLabel } = usePayments();

/**
 * What a bulk option costs: the price for every cycle, less its discount.
 */
const optionPrice = (option: { cycles: number; discount: number }) =>
  Math.round(
    (form.value.price || 0) *
      (option.cycles || 0) *
      (1 - (option.discount || 0) / 100) *
      100,
  ) / 100;

/**
 * A sensible next option: 6 periods, then 12, then a year more each time.
 */
const nextCycles = () => {
  const taken = form.value.billing_options.map((o) => o.cycles);
  return (
    [6, 12, 24, 36].find((c) => !taken.includes(c)) ||
    Math.max(1, ...taken) + 12
  );
};

const {
  data: plansData,
  loading,
  send: reload,
} = useRequest(loadAdminPlansRequest);
const { data: featuresData } = useRequest(loadPlanFeaturesRequest);

const plans = computed(() => plansData.value || []);
const features = computed(() => featuresData.value || []);

const intervals = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

const editing = ref(false);
const editingPlan = ref<Plan | null>(null);
const form = ref<PlanForm & { id?: number }>(blank());

function blank(): PlanForm & { id?: number } {
  return {
    name: '',
    slug: '',
    description: '',
    price: 0,
    interval: 'month',
    interval_count: 1,
    billing_options: [],
    features: Object.fromEntries(
      features.value?.map((f) => [f.key, f.default]) || [],
    ),
    is_default: false,
    active: true,
    sort: plans.value.length,
  };
}

const edit = (plan?: Plan) => {
  editingPlan.value = plan || null;
  form.value = plan
    ? {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        price: plan.price,
        interval: plan.interval,
        interval_count: plan.intervalCount,
        billing_options: plan.billingOptions
          .filter((o) => o.cycles > 1)
          .map((o) => ({ cycles: o.cycles, discount: o.discount })),
        features: { ...plan.features },
        is_default: plan.isDefault,
        active: plan.active,
        sort: plan.sort,
      }
    : blank();
  editing.value = true;
};

const {
  loading: saving,
  error,
  send: sendSave,
} = useRequest(
  () => {
    const { id, ...body } = form.value;
    return savePlanRequest(body, id);
  },
  { immediate: false },
);

const errors = computed<Record<string, string>>(
  () => (error.value as unknown as ResponseBody<string>)?.errors || {},
);

const save = async () => {
  const res = await sendSave();
  notify(res.message, 'success');
  editing.value = false;
  reload();
};

const remove = (plan: Plan) => {
  $q.dialog({
    dark: true,
    title: `Delete ${plan.name}?`,
    message: plan.subscribers
      ? 'People are subscribed to this plan, so it will be deactivated instead. They keep it until their time runs out.'
      : "This can't be undone.",
    cancel: true,
    ok: { label: 'Delete', color: 'red-5', flat: true, noCaps: true },
  }).onOk(async () => {
    const res = await deletePlanRequest(plan.id);
    notify(res.message, 'success');
    reload();
  });
};

useMeta(() => ({
  title: 'Plans',
  titleTemplate: (title) => `${title} - Toneflix Music`,
}));
</script>
