<template>
  <q-dialog :model-value="!!mode" @update:model-value="(open) => !open && close()" @before-show="reset">
    <q-card class="w-full max-w-md bg-dark">
      <q-card-section class="text-lg font-bold">{{ title }}</q-card-section>

      <q-card-section class="pt-0 flex flex-col gap-3">
        <template v-if="mode === 'edit'">
          <div class="grid gap-3 grid-cols-2">
            <q-input dark filled dense label="First name" hide-bottom-space :error="!!errors.firstname" :error-message="errors.firstname" v-model="profile.firstname" />
            <q-input dark filled dense label="Last name" hide-bottom-space :error="!!errors.lastname" :error-message="errors.lastname" v-model="profile.lastname" />
          </div>
          <q-input dark filled dense label="Username" hide-bottom-space :error="!!errors.username" :error-message="errors.username" v-model="profile.username" />
          <q-input dark filled dense type="email" label="Email" hide-bottom-space :error="!!errors.email" :error-message="errors.email" v-model="profile.email" />
          <q-input dark filled dense label="Phone" hide-bottom-space :error="!!errors.phone" :error-message="errors.phone" v-model="profile.phone" />
          <div class="grid gap-3 grid-cols-3">
            <q-input dark filled dense label="Country" hide-bottom-space v-model="profile.country" />
            <q-input dark filled dense label="State" hide-bottom-space v-model="profile.state" />
            <q-input dark filled dense label="City" hide-bottom-space v-model="profile.city" />
          </div>
          <q-input dark filled dense autogrow label="About" hide-bottom-space v-model="profile.about" />
        </template>

        <template v-else-if="mode === 'suspend'">
          <q-option-group dark inline color="toneflix" :options="durations" v-model="days" />
          <div class="text-sm text-grey-5">
            {{
              days
                ? `They are signed out now and can sign in again after ${days} day${days === 1 ? '' : 's'}.`
                : 'They are signed out now and can\'t sign in until you lift the ban.'
            }}
          </div>
        </template>

        <template v-else-if="mode === 'roles'">
          <q-option-group dark type="checkbox" color="toneflix" :options="roleOptions" v-model="roles" />
          <div class="text-sm text-grey-5">Each role's permissions come from app:sync-roles.</div>
        </template>

        <template v-else-if="mode === 'plan'">
          <q-select
            dark
            filled
            dense
            emit-value
            map-options
            label="Plan"
            hide-bottom-space
            :loading="plansLoading"
            :options="planOptions"
            :error="!!errors.plan_id"
            :error-message="errors.plan_id"
            v-model="planId"
          />
          <q-input
            dark
            filled
            dense
            type="number"
            label="How long"
            hide-bottom-space
            :min="1"
            :suffix="selectedPlan ? `× ${selectedPlan.intervalCount > 1 ? `${selectedPlan.intervalCount} ` : ''}${selectedPlan.interval}` : ''"
            :error="!!errors.cycles"
            :error-message="errors.cycles"
            v-model.number="cycles"
          />
          <div class="text-sm text-grey-5" v-if="selectedPlan">
            {{
              selectedPlan.id === user.plan?.id
                ? 'This adds time after what they already have.'
                : 'This replaces their current plan from now. They are not charged.'
            }}
          </div>
        </template>

        <template v-else-if="mode === 'funds' || mode === 'credits'">
          <q-option-group
            dark
            inline
            color="toneflix"
            :options="[
              { value: 1, label: mode === 'funds' ? 'Add funds' : 'Grant credits' },
              { value: -1, label: mode === 'funds' ? 'Take funds' : 'Take back' },
            ]"
            v-model="direction"
          />
          <q-input
            dark
            filled
            dense
            type="number"
            hide-bottom-space
            :min="0"
            :label="mode === 'funds' ? `Amount (${currency})` : 'Credits'"
            :error="!!errors.amount || !!errors.credits"
            :error-message="errors.amount || errors.credits"
            v-model.number="amount"
          />
          <div class="text-sm text-grey-5">
            {{
              mode === 'funds'
                ? 'Changes the withdrawable balance at once. The user sees the reason in their earnings.'
                : 'Granted credits never expire. Only bought or granted credits can be taken back.'
            }}
          </div>
        </template>

        <q-input
          dark
          filled
          dense
          autogrow
          hide-bottom-space
          maxlength="255"
          :label="needsReason ? 'Reason' : 'Reason (optional)'"
          :error="!!errors.reason"
          :error-message="errors.reason"
          v-model="reason"
          v-if="mode !== 'edit' && mode !== 'roles'"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat no-caps label="Cancel" @click="close" />
        <q-btn
          unelevated
          rounded
          no-caps
          :color="mode === 'suspend' ? 'red-8' : 'toneflix'"
          :label="confirmLabel"
          :loading="saving"
          :disable="needsReason && !reason"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRequest } from 'alova/client';
import { notify } from 'src/utils/helpers';
import type { Plan, ResponseBody } from 'src/utils/models';
import { loadAdminPlansRequest } from 'src/utils/requests/plans';
import {
  adjustUserCreditsRequest,
  adjustUserFundsRequest,
  assignUserPlanRequest,
  saveUserRolesRequest,
  suspendUserRequest,
  updateAdminUserRequest,
  type AdminUser,
  type AdminUserDetail,
} from 'src/utils/requests/adminUsers';

export type ManageMode = 'edit' | 'suspend' | 'roles' | 'plan' | 'funds' | 'credits';

const props = defineProps<{
  user: AdminUser;
  allRoles: string[];
  currency: string;
}>();

const mode = defineModel<ManageMode | null>('mode', { default: null });

const emit = defineEmits<{ done: [detail: AdminUserDetail] }>();

const titles: Record<ManageMode, string> = {
  edit: 'Edit profile',
  suspend: 'Suspend account',
  roles: 'Roles',
  plan: 'Give a plan',
  funds: 'Adjust balance',
  credits: 'Adjust AI credits',
};

const durations = [
  { value: 1, label: '1 day' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 0, label: 'Ban' },
];

const saving = ref(false);
const errors = ref<Record<string, string>>({});
const reason = ref('');
const days = ref(7);
const roles = ref<string[]>([]);
const planId = ref<number>();
const cycles = ref(1);
const direction = ref(1);
const amount = ref<number>();
const profile = ref<Partial<AdminUser>>({});

const title = computed(() => (mode.value ? titles[mode.value] : ''));
const needsReason = computed(() => ['suspend', 'funds', 'credits'].includes(mode.value || ''));
const confirmLabel = computed(() =>
  mode.value === 'suspend' ? (days.value ? 'Suspend' : 'Ban') : mode.value === 'plan' ? 'Give plan' : 'Save',
);
const roleOptions = computed(() => props.allRoles.map((role) => ({ value: role, label: role })));

const { data: plans, loading: plansLoading, send: loadPlans } = useRequest(loadAdminPlansRequest, { immediate: false, initialData: [] });
const planOptions = computed(() =>
  (plans.value as Plan[])
    .filter((plan) => !plan.isDefault)
    .map((plan) => ({
      value: plan.id,
      label: !plan.active ? `${plan.name} (inactive)` : plan.hidden ? `${plan.name} (hidden)` : plan.name,
    })),
);
const selectedPlan = computed(() => (plans.value as Plan[]).find((plan) => plan.id === planId.value));

const reset = () => {
  const u = props.user;
  errors.value = {};
  reason.value = '';
  days.value = 7;
  direction.value = 1;
  amount.value = undefined;
  cycles.value = 1;
  roles.value = [...(u.roles || [])];
  planId.value = u.plan && !u.plan.isDefault ? u.plan.id || undefined : undefined;
  profile.value = {
    firstname: u.firstname,
    lastname: u.lastname,
    username: u.username,
    email: u.email,
    phone: u.phone,
    country: u.country,
    state: u.state,
    city: u.city,
    about: u.about,
  };

  if (mode.value === 'plan') void loadPlans();
};

const close = () => (mode.value = null);

const submit = async () => {
  const id = props.user.id;
  const value = Math.abs(Number(amount.value || 0)) * direction.value;

  const requests: Record<ManageMode, () => Promise<ResponseBody<AdminUserDetail>>> = {
    edit: () => updateAdminUserRequest(id, profile.value).send(),
    suspend: () => suspendUserRequest(id, reason.value, days.value || null).send(),
    roles: () => saveUserRolesRequest(id, roles.value).send(),
    plan: () => assignUserPlanRequest(id, planId.value || 0, cycles.value || 1, reason.value || undefined).send(),
    funds: () => adjustUserFundsRequest(id, value, reason.value).send(),
    credits: () => adjustUserCreditsRequest(id, Math.round(value), reason.value).send(),
  };

  if (!mode.value) return;

  saving.value = true;
  errors.value = {};

  try {
    const body = await requests[mode.value]();
    notify(body.message, 'success');
    emit('done', body.data);
    close();
  } catch (e) {
    const err = e as ResponseBody<undefined, Record<string, string | string[]>>;
    errors.value = Object.fromEntries(
      Object.entries(err?.errors || {}).map(([key, value]) => [key, Array.isArray(value) ? value[0] || '' : value]),
    );
    if (!Object.keys(errors.value).length) notify(err?.message || 'That didn\'t work.', 'error');
  } finally {
    saving.value = false;
  }
};
</script>
