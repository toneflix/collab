<template>
  <q-page padding>
    <div class="max-w-5xl mx-auto">
      <div class="py-2">
        <q-btn flat dense no-caps icon="lucide-arrow-left" label="Users" class="!flex-none" :to="{ name: 'admin.users' }" />
      </div>

      <div class="flex flex-col gap-4" v-if="loading && !detail">
        <ListSkeleton :rows="1" />
        <BlockSkeleton variant="stats" :count="4" />
      </div>
      <SimpleInfo :text="error" v-else-if="!detail" />

      <div class="flex flex-col gap-4" v-else>
        <div class="profile">
          <q-avatar size="72px" color="grey-9" class="!flex-none">
            <img :src="user.imageUrl" v-if="user.imageUrl" />
            <q-icon name="lucide-user" v-else />
          </q-avatar>
          <div class="min-w-0">
            <h1 class="text-2xl font-circlular-std truncate">
              {{ user.fullname || user.username }}
              <q-icon name="lucide-circle-check" color="toneflix" size="18px" v-if="user.verified" />
            </h1>
            <div class="text-grey-5 truncate">@{{ user.username }} · {{ user.email }}</div>
            <div class="flex flex-wrap gap-1 mt-2">
              <q-badge rounded class="!flex-none" color="red-9" label="Banned" v-if="user.suspended && !user.suspendedUntil" />
              <q-badge rounded class="!flex-none" color="orange-9" label="Suspended" v-else-if="user.suspended" />
              <q-badge rounded class="!flex-none" outline color="grey-5" :key="role" :label="role" v-for="role in user.roles" />
              <q-badge rounded class="!flex-none" color="toneflix" :label="user.plan?.name" v-if="user.plan && !user.plan.isDefault" />
              <q-badge rounded class="!flex-none" outline color="grey-6" :label="`Joined ${date.formatDate(user.createdAt, 'MMM D, YYYY')}`" />
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <q-btn outline rounded no-caps padding="4px 14px" class="!flex-none" icon="lucide-pencil" label="Edit" @click="mode = 'edit'" v-if="can.update" />
          <q-btn
            outline
            rounded
            no-caps
            padding="4px 14px"
            class="!flex-none"
            :icon="user.verified ? 'lucide-circle-x' : 'lucide-circle-check'"
            :label="user.verified ? 'Remove badge' : 'Verify'"
            :loading="busy === 'verify'"
            @click="toggleVerified"
            v-if="can.verify"
          />
          <q-btn outline rounded no-caps padding="4px 14px" class="!flex-none" icon="lucide-shield-user" label="Roles" @click="mode = 'roles'" v-if="can.roles" />
          <q-btn outline rounded no-caps padding="4px 14px" class="!flex-none" icon="lucide-layers" label="Give plan" @click="mode = 'plan'" v-if="can.plan" />
          <q-btn outline rounded no-caps padding="4px 14px" class="!flex-none" icon="lucide-wallet" label="Funds" @click="mode = 'funds'" v-if="can.funds" />
          <q-btn outline rounded no-caps padding="4px 14px" class="!flex-none" icon="lucide-wand-sparkles" label="AI credits" @click="mode = 'credits'" v-if="can.credits" />
          <template v-if="can.suspend">
            <q-btn
              outline
              rounded
              no-caps
              padding="4px 14px"
              color="green-5"
              class="!flex-none"
              icon="lucide-lock-open"
              label="Lift suspension"
              :loading="busy === 'unsuspend'"
              @click="unsuspend"
              v-if="user.suspended"
            />
            <q-btn outline rounded no-caps padding="4px 14px" color="red-4" class="!flex-none" icon="lucide-ban" label="Suspend" @click="mode = 'suspend'" v-else />
          </template>
        </div>

        <q-banner rounded dense class="text-white bg-red-10" v-if="user.suspended">
          {{
            user.suspendedUntil
              ? `Suspended until ${date.formatDate(user.suspendedUntil, 'MMM D, YYYY h:mm A')}.`
              : 'Banned.'
          }}
          {{ user.suspensionReason }}
        </q-banner>

        <div class="grid gap-3 grid-cols-2 lg:grid-cols-4" v-if="stats">
          <div class="stat" :key="tile.label" v-for="tile in tiles">
            <div class="stat__label">{{ tile.label }}</div>
            <div class="stat__value">{{ tile.value }}</div>
            <div class="stat__note">{{ tile.note }}</div>
          </div>
        </div>

        <div class="grid gap-3 lg:grid-cols-3" v-if="stats">
          <div class="section">
            <div class="section__head">
              <div class="font-bold">Plan</div>
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                color="red-4"
                label="Remove"
                :loading="busy === 'plan'"
                @click="endPlan"
                v-if="can.plan && !stats.plan.isDefault"
              />
            </div>
            <div class="text-lg">{{ stats.plan.name }}</div>
            <div class="text-sm text-grey-5">
              {{
                stats.plan.isDefault
                  ? 'The default plan.'
                  : `Until ${date.formatDate(stats.plan.paidUntil || stats.plan.current?.endsAt, 'MMM D, YYYY')}`
              }}
            </div>
            <q-separator dark class="my-4" />
            <div class="row-item"><span>Storage</span><span>{{ storage }}</span></div>
          </div>

          <div class="section">
            <div class="section__head">
              <div class="font-bold">AI credits</div>
              <div class="text-grey-5">{{ stats.ai.balance.total.toLocaleString() }} left</div>
            </div>
            <div class="row-item"><span>From plan this month</span><span>{{ stats.ai.balance.planLeft }} of {{ stats.ai.balance.allowance }}</span></div>
            <div class="row-item"><span>Bought or granted</span><span>{{ stats.ai.balance.purchased.toLocaleString() }}</span></div>
            <div class="row-item"><span>Used this month</span><span>{{ stats.ai.usedThisMonth.toLocaleString() }}</span></div>
            <div class="row-item"><span>Used all time</span><span>{{ stats.ai.used.toLocaleString() }}</span></div>
            <div class="row-item"><span>AI jobs</span><span>{{ stats.ai.jobs }}{{ stats.ai.failedJobs ? ` (${stats.ai.failedJobs} failed)` : '' }}</span></div>
          </div>

          <div class="section">
            <div class="section__head">
              <div class="font-bold">Earnings</div>
              <div class="text-grey-5">{{ price(stats.earnings.earned) }}</div>
            </div>
            <div class="row-item"><span>Available</span><span>{{ price(stats.earnings.available) }}</span></div>
            <div class="row-item"><span>Clearing</span><span>{{ price(stats.earnings.clearing) }}</span></div>
            <div class="row-item"><span>Being withdrawn</span><span>{{ price(stats.earnings.inFlight) }}</span></div>
            <div class="row-item"><span>Withdrawn</span><span>{{ price(stats.earnings.withdrawn) }}</span></div>
            <q-separator dark class="my-4" />
            <div class="row-item"><span>Spent on the app</span><span>{{ price(stats.spend.total) }}</span></div>
          </div>
        </div>

        <SettingsSections :sections="sections" v-model="tab">
          <div class="p-4" v-if="tab === 'details'">
            <div class="row-item" :key="field.label" v-for="field in details">
              <span>{{ field.label }}</span><span>{{ field.value || '—' }}</span>
            </div>
          </div>

          <template v-else>
            <q-list separator v-if="tab === 'activity' && entries.length">
              <q-item :key="entry.id" v-for="entry in entries">
                <q-item-section>
                  <q-item-label>{{ describeAction(entry, price) }}</q-item-label>
                  <q-item-label caption v-if="entry.reason">“{{ entry.reason }}”</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label caption>{{ actionActor(entry) }}</q-item-label>
                  <q-item-label caption>{{ date.formatDate(entry.createdAt, 'MMM D, YYYY h:mm A') }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
            <q-list separator v-else-if="tab !== 'activity' && transactions.length">
              <TransactionItem :key="transaction.id" :transaction="transaction" v-for="transaction in transactions" />
            </q-list>
            <ListSkeleton dense side :rows="4" v-else-if="listLoading" />
            <div class="py-8 text-center text-grey-5" v-else>Nothing here yet.</div>

            <div class="flex justify-center py-4" v-if="listPages > 1">
              <q-pagination class="!flex-none" v-model="listPage" :max="listPages" :max-pages="7" direction-links />
            </div>
          </template>
        </SettingsSections>
      </div>
    </div>

    <UserManageDialog
      :user="user"
      :all-roles="detail.roles"
      :currency="stats?.currency || ''"
      @done="applied"
      v-model:mode="mode"
      v-if="detail"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { date, useMeta, useQuasar } from 'quasar';
import { useRoute } from 'vue-router';
import { useWatcher } from 'alova/client';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import TransactionItem from 'src/components/Payments/TransactionItem.vue';
import SettingsSections, { type SettingsSection } from 'src/components/Admin/SettingsSections.vue';
import UserManageDialog, { type ManageMode } from 'src/components/Admin/UserManageDialog.vue';
import { usePayments } from 'src/composables/usePayments';
import { formatBytes, notify } from 'src/utils/helpers';
import type { ResponseBody, Transaction } from 'src/utils/models';
import {
  actionActor,
  describeAction,
  endUserPlanRequest,
  loadAdminUserRequest,
  loadUserActivityRequest,
  loadUserTransactionsRequest,
  unsuspendUserRequest,
  verifyUserRequest,
  type AdminAction,
  type AdminUserDetail,
} from 'src/utils/requests/adminUsers';
import BlockSkeleton from 'src/components/Skeletons/BlockSkeleton.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';

const $q = useQuasar();
const route = useRoute();
const { price } = usePayments();

const detail = ref<AdminUserDetail>();
const loading = ref(true);
const error = ref('');
const busy = ref<string>();
const mode = ref<ManageMode | null>(null);
type Tab = 'activity' | 'payments' | 'earnings' | 'details';

const tab = ref<Tab>('activity');

const sections: SettingsSection<Tab>[] = [
  {
    key: 'activity',
    icon: 'lucide-history',
    title: 'Admin activity',
    caption: 'What admins changed on this account.',
    flush: true,
  },
  {
    key: 'payments',
    icon: 'lucide-receipt',
    title: 'Payments',
    caption: 'Plans, credits and tips they paid for.',
    flush: true,
  },
  {
    key: 'earnings',
    icon: 'lucide-circle-dollar-sign',
    title: 'Earnings',
    caption: 'Money they earned and withdrew.',
    flush: true,
  },
  {
    key: 'details',
    icon: 'lucide-id-card',
    title: 'Details',
    caption: 'Account and profile fields.',
    flush: true,
  },
];
const listPage = ref(1);

const id = computed(() => String(route.params.id));
const user = computed(() => detail.value!.user);
const can = computed(() => detail.value!.can);
const stats = computed(() => detail.value?.stats);

const load = async () => {
  loading.value = true;
  try {
    detail.value = (await loadAdminUserRequest(id.value).send()).data;
  } catch (e) {
    error.value = (e as ResponseBody)?.message || "This user couldn't be loaded.";
  } finally {
    loading.value = false;
  }
};

watch(id, load, { immediate: true });

const { data: list, loading: listLoading, send: reloadList } = useWatcher(
  () =>
    tab.value === 'activity'
      ? loadUserActivityRequest(id.value, listPage.value)
      : loadUserTransactionsRequest(id.value, tab.value === 'earnings' ? 'earnings' : 'payments', listPage.value),
  [tab, listPage, id],
  { immediate: true },
);

watch(tab, () => (listPage.value = 1));

const entries = computed(() => (tab.value === 'activity' ? ((list.value?.data || []) as AdminAction[]) : []));
const transactions = computed(() => (tab.value !== 'activity' ? ((list.value?.data || []) as Transaction[]) : []));
const listPages = computed(() => list.value?.meta?.lastPage || 1);

const storage = computed(() => {
  const s = stats.value?.storage;
  if (!s) return '';
  return s.limit ? `${formatBytes(s.used)} of ${formatBytes(s.limit)}` : `${formatBytes(s.used)} (no limit)`;
});

const tiles = computed(() => {
  const s = stats.value;
  if (!s) return [];

  return [
    { label: 'Projects', value: s.content.projects.toLocaleString(), note: `${s.content.collabs} collabs` },
    { label: 'Releases', value: s.content.releases.toLocaleString(), note: `${s.content.tracks} tracks` },
    { label: 'Followers', value: s.content.followers.toLocaleString(), note: `Following ${s.content.following}` },
    { label: 'Available to withdraw', value: price(s.earnings.available), note: `${price(s.spend.total)} spent` },
  ];
});

const details = computed(() => {
  const u = user.value;
  return [
    { label: 'First name', value: u.firstname },
    { label: 'Last name', value: u.lastname },
    { label: 'Phone', value: u.phone },
    { label: 'Email confirmed', value: u.emailVerifiedAt ? date.formatDate(u.emailVerifiedAt, 'MMM D, YYYY') : 'No' },
    { label: 'Country', value: u.country },
    { label: 'State', value: u.state },
    { label: 'City', value: u.city },
    { label: 'Address', value: u.address },
    { label: 'About', value: u.about },
  ];
});

/** Keep the stats from the page load when an action returns the account without them. */
const applied = (next: AdminUserDetail) => {
  detail.value = { ...next, stats: next.stats || detail.value?.stats };
  void load();
  void reloadList();
};

const run = async (key: string, request: () => Promise<ResponseBody<AdminUserDetail>>) => {
  busy.value = key;
  try {
    const body = await request();
    notify(body.message, 'success');
    applied(body.data);
  } catch (e) {
    const err = e as ResponseBody;
    const first = err?.errors ? Object.values(err.errors)[0] : undefined;
    notify((Array.isArray(first) ? first[0] : first) || err?.message || "That didn't work.", 'error');
  } finally {
    busy.value = undefined;
  }
};

const toggleVerified = () => {
  const verified = !user.value.verified;
  void run('verify', () => verifyUserRequest(user.value.id, verified, verified).send());
};

const unsuspend = () => void run('unsuspend', () => unsuspendUserRequest(user.value.id).send());

const endPlan = () => {
  $q.dialog({
    dark: true,
    title: `Remove ${stats.value?.plan.name}?`,
    message: 'They go back to the default plan now, including any time paid in advance. Nothing is refunded.',
    prompt: { model: '', type: 'text', outlined: true, dark: true, label: 'Reason (optional)', maxlength: 255 },
    cancel: { flat: true, noCaps: true, label: 'Keep it' },
    ok: { unelevated: true, rounded: true, noCaps: true, color: 'red-8', label: 'Remove' },
  }).onOk((reason: string) => void run('plan', () => endUserPlanRequest(user.value.id, reason || undefined).send()));
};

useMeta(() => ({
  title: detail.value ? `${user.value.fullname || user.value.username} - Users` : 'Users',
  titleTemplate: (title) => `${title} - Toneflix Music`,
}));
</script>

<style lang="scss" scoped>
.profile {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 16px;
}

.stat,
.section {
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
}

.stat {
  &__label {
    font-size: 13px;
    color: #9e9e9e;
  }

  &__value {
    margin-top: 4px;
    font-size: 24px;
    font-weight: 700;
    line-height: 1.2;
  }

  &__note {
    margin-top: 2px;
    font-size: 13px;
    color: #9e9e9e;
  }
}

.section__head {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;

  > * {
    flex: none;
  }
}

.row-item {
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 0;
  font-size: 14px;

  > :first-child {
    flex: none;
    color: #9e9e9e;
  }

  > :last-child {
    flex: 0 1 auto;
    text-align: right;
    overflow-wrap: anywhere;
  }
}
</style>
