<template>
  <q-page padding>
    <div class="max-w-5xl mx-auto">
      <div class="py-8">
        <h1 class="text-3xl font-circlular-std">Overview</h1>
        <p class="text-grey-5" v-if="stats">How the app is doing over the last {{ stats.days }} days.</p>
      </div>

      <BlockSkeleton variant="stats" :count="8" v-if="loading && !stats" />

      <div class="py-10 text-center text-grey-5" v-else-if="!stats">
        {{ error || 'Your account has no admin permissions.' }}
      </div>

      <div class="flex flex-col gap-4" v-else>
        <div class="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <div class="stat" :key="tile.label" v-for="tile in tiles">
            <div class="stat__label">{{ tile.label }}</div>
            <div class="stat__value">{{ tile.value }}</div>
            <div class="stat__note" v-if="tile.note">{{ tile.note }}</div>
          </div>
        </div>

        <div class="grid gap-3 lg:grid-cols-2">
          <div class="section">
            <div class="section__head">
              <div class="font-bold">Sign-ups</div>
              <div class="text-grey-5">{{ stats.people.new.toLocaleString() }} new</div>
            </div>
            <DailyBars :days="stats.people.daily" label="Sign-ups per day" />
          </div>

          <div class="section" v-if="stats.revenue">
            <div class="section__head">
              <div class="font-bold">Revenue</div>
              <div class="text-grey-5">{{ price(stats.revenue.recent) }}</div>
            </div>
            <DailyBars :days="stats.revenue.daily" label="Revenue per day" :format="price" />
          </div>
        </div>

        <div class="grid gap-3 lg:grid-cols-2">
          <div class="section" v-if="stats.revenue">
            <div class="mb-4 font-bold">Payments by type</div>
            <div class="text-grey-5" v-if="!stats.revenue.byPurpose.length">
              No payments in the last {{ stats.days }} days.
            </div>
            <div class="row-item" :key="row.purpose" v-for="row in stats.revenue.byPurpose">
              <div>{{ purposeLabel(row.purpose) }}</div>
              <div class="text-grey-5">{{ row.count.toLocaleString() }}</div>
              <div class="text-right">{{ price(row.amount) }}</div>
            </div>
            <q-separator dark class="my-4" />
            <div class="row-item text-grey-5">
              <div>All time</div>
              <div />
              <div class="text-right">{{ price(stats.revenue.total) }}</div>
            </div>
            <div class="row-item text-grey-5">
              <div>Kept after creator shares</div>
              <div />
              <div class="text-right">{{ price(stats.revenue.kept) }}</div>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <router-link class="section section--link" :to="{ name: 'admin.payouts' }" v-if="stats.payouts">
              <div class="section__head">
                <div class="font-bold">Withdrawals</div>
                <q-badge rounded color="orange-9" :label="`${stats.payouts.pending} waiting`" v-if="stats.payouts.pending" />
              </div>
              <div class="text-sm text-grey-5">
                {{ price(stats.payouts.pendingAmount) }} waiting for approval ·
                {{ stats.payouts.processing }} with the bank · {{ price(stats.payouts.paid) }} paid out
              </div>
            </router-link>

            <router-link class="section section--link" :to="{ name: 'admin.moderation' }" v-if="stats.moderation">
              <div class="section__head">
                <div class="font-bold">Moderation</div>
                <q-badge
                  rounded
                  color="red-9"
                  :label="`${stats.moderation.pending} to review`"
                  v-if="stats.moderation.pending"
                />
              </div>
              <div class="text-sm text-grey-5">
                {{ stats.moderation.pending }} reported items · {{ stats.moderation.appeals }} appeals
              </div>
            </router-link>

            <div class="section">
              <div class="mb-1 font-bold">Content</div>
              <div class="text-sm text-grey-5">
                {{ count(stats.content.newReleases, 'release') }} and
                {{ count(stats.content.newProjects, 'project') }} in the last {{ stats.days }} days
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import DailyBars from 'src/components/Utilities/DailyBars.vue';
import { usePayments } from 'src/composables/usePayments';
import type { ResponseBody } from 'src/utils/models';
import { loadAdminStatsRequest, type AdminStats } from 'src/utils/requests/adminStats';
import BlockSkeleton from 'src/components/Skeletons/BlockSkeleton.vue';

const { price } = usePayments();

const loading = ref(true);
const error = ref('');
const stats = ref<AdminStats>();

const purposes: Record<string, string> = {
  premium: 'Subscriptions',
  release: 'Releases',
  stems: 'Stems',
  tip: 'Tips',
  credits: 'AI credits',
};
const purposeLabel = (purpose: string) => purposes[purpose] || purpose;
const count = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

const tiles = computed(() => {
  const s = stats.value;
  if (!s) return [];

  return [
    { label: 'Users', value: s.people.users.toLocaleString(), note: `${s.people.new.toLocaleString()} new` },
    { label: 'Subscribers', value: s.people.subscribers.toLocaleString(), note: 'On a paid plan now' },
    s.revenue
      ? { label: `Revenue, ${s.days} days`, value: price(s.revenue.recent), note: `${price(s.revenue.total)} all time` }
      : null,
    { label: 'Releases', value: s.content.releases.toLocaleString(), note: count(s.content.projects, 'project') },
  ].filter((tile) => tile !== null);
});

onMounted(async () => {
  try {
    stats.value = await loadAdminStatsRequest().send();
  } catch (e) {
    error.value = (e as ResponseBody)?.message || "The overview couldn't be loaded.";
  } finally {
    loading.value = false;
  }
});

useMeta(() => ({
  title: 'Admin',
  titleTemplate: (title) => `${title} - Toneflix Music`,
}));
</script>

<style lang="scss" scoped>
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
    font-size: 26px;
    font-weight: 700;
    line-height: 1.2;
  }

  &__note {
    margin-top: 2px;
    font-size: 13px;
    color: #9e9e9e;
  }
}

.section {
  &__head {
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

  &--link {
    display: block;
    color: inherit;
    text-decoration: none;
    transition: background 0.15s;

    &:hover {
      background: rgba(255, 255, 255, 0.07);
    }
  }
}

.row-item {
  display: grid;
  grid-template-columns: 1fr auto 120px;
  gap: 12px;
  padding: 4px 0;
}
</style>
