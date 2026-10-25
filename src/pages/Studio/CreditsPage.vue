<template>
  <q-page padding>
    <div class="max-w-2xl mx-auto">
      <h1 class="mb-1 text-2xl font-bold">AI credits</h1>
      <p class="mb-4 text-sm text-grey-5">
        Credits pay for the AI tools in the studio. Your plan's credits are used
        first and start over each month. Credits you buy never expire.
      </p>

      <q-spinner v-if="!account" />

      <template v-else>
        <div class="mb-4 notice" v-if="!account.access">
          <div class="font-bold">AI tools come with Premium</div>
          <div class="text-sm text-grey-4">
            Generate music from a prompt and split stems with AI.
          </div>
          <q-btn
            unelevated
            rounded
            no-caps
            color="toneflix"
            class="mt-3 !flex-none"
            label="See plans"
            :to="{ name: 'premium' }"
          />
        </div>

        <q-card flat bordered class="mb-4 bg-dark">
          <q-card-section class="grid gap-4 sm:grid-cols-3">
            <div>
              <div class="text-xs text-grey-5">Credits left</div>
              <div class="text-3xl font-bold">
                {{ account.balance.total.toLocaleString() }}
              </div>
            </div>
            <div>
              <div class="text-xs text-grey-5">From your plan</div>
              <div class="text-lg font-bold">
                {{ account.balance.planLeft }} / {{ account.balance.allowance }}
              </div>
              <div class="text-xs text-grey-6" v-if="account.balance.allowance">
                Back to {{ account.balance.allowance }} on
                {{ day(account.balance.resetsAt) }}
              </div>
            </div>
            <div>
              <div class="text-xs text-grey-5">Bought</div>
              <div class="text-lg font-bold">
                {{ account.balance.purchased.toLocaleString() }}
              </div>
              <div class="text-xs text-grey-6">Never expire</div>
            </div>
          </q-card-section>
          <q-separator dark />
          <q-card-section class="text-sm text-grey-4">
            <template v-if="account.music.pricing === 'per10s'">
              Music from {{ account.music.name }} uses
              {{ account.music.credits }} credits for every 10 seconds, so a
              30 second loop uses {{ musicCost(account, 30, false) }}.
            </template>
            <template v-else>
              A song from {{ account.music.name }} uses
              {{ account.music.credits }} credits.
            </template>
            Splitting into stems uses {{ account.costs.stems }}.
          </q-card-section>
        </q-card>

        <template
          v-if="account.access && account.enabled && account.packs.length"
        >
          <div class="mb-2 font-bold">Buy credits</div>
          <div class="grid gap-3 mb-6 sm:grid-cols-3">
            <q-card
              flat
              bordered
              class="flex flex-col bg-dark"
              :key="pack.credits"
              v-for="pack in account.packs"
            >
              <q-card-section>
                <div class="flex items-center gap-2">
                  <div class="text-xl font-bold">
                    {{ pack.credits.toLocaleString() }}
                  </div>
                  <q-badge
                    rounded
                    color="green-8"
                    class="!flex-none"
                    :label="`Save ${pack.discount}%`"
                    v-if="pack.discount > 0"
                  />
                </div>
                <div class="text-xs text-grey-5">credits</div>
                <div class="mt-2 text-lg">{{ price(pack.price) }}</div>
              </q-card-section>
              <q-card-actions class="mt-auto">
                <PayButton
                  unelevated
                  rounded
                  class="w-full"
                  color="toneflix"
                  label="Buy"
                  :amount="pack.price"
                  :body="{ purpose: 'credits', credits: pack.credits }"
                  @paid="reload"
                />
              </q-card-actions>
            </q-card>
          </div>
        </template>

        <div class="mb-2 font-bold">History</div>
        <q-list dark separator class="history">
          <q-item :key="entry.id" v-for="entry in history">
            <q-item-section avatar>
              <q-icon
                :name="icons[entry.type]"
                :color="entry.credits > 0 ? 'green-5' : 'grey-5'"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label class="truncate">{{
                entry.description || entry.type
              }}</q-item-label>
              <q-item-label caption>{{ when(entry.createdAt) }}</q-item-label>
            </q-item-section>
            <q-item-section
              side
              :class="entry.credits > 0 ? 'text-green-5' : 'text-grey-4'"
            >
              {{ entry.credits > 0 ? '+' : ''
              }}{{ entry.credits.toLocaleString() }}
            </q-item-section>
          </q-item>
          <q-item v-if="loadedHistory && !history.length">
            <q-item-section class="text-grey-6"
              >No credits used or bought yet.</q-item-section
            >
          </q-item>
        </q-list>
        <div class="mt-3 text-center" v-if="page < lastPage">
          <q-btn
            flat
            rounded
            no-caps
            label="Show more"
            :loading="loadingHistory"
            @click="loadHistory(page + 1)"
          />
        </div>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { date, useMeta } from 'quasar';
import { onMounted, ref } from 'vue';
import PayButton from 'src/components/Payments/PayButton.vue';
import { usePayments } from 'src/composables/usePayments';
import {
  loadAiAccountRequest,
  loadCreditHistoryRequest,
  musicCost,
  type AiAccount,
  type CreditEntry,
} from 'src/utils/requests/ai';

const { price } = usePayments();

const account = ref<AiAccount>();
const history = ref<CreditEntry[]>([]);
const page = ref(1);
const lastPage = ref(1);
const loadingHistory = ref(false);
const loadedHistory = ref(false);

const icons: Record<CreditEntry['type'], string> = {
  purchase: 'fas fa-cart-shopping',
  spend: 'fas fa-wand-magic-sparkles',
  refund: 'fas fa-rotate-left',
  grant: 'fas fa-gift',
};

const day = (value: string) => date.formatDate(value, 'MMM D');
const when = (value: string) => date.formatDate(value, 'MMM D, h:mm A');

const loadHistory = async (to = 1) => {
  loadingHistory.value = true;
  try {
    const res = await loadCreditHistoryRequest(to).send();
    history.value = to === 1 ? res.data : [...history.value, ...res.data];
    page.value = res.meta.currentPage;
    lastPage.value = res.meta.lastPage;
  } finally {
    loadingHistory.value = false;
    loadedHistory.value = true;
  }
};

const reload = async () => {
  account.value = await loadAiAccountRequest().send();
  await loadHistory(1);
};

onMounted(() => void reload());

useMeta(() => ({
  title: 'AI credits',
  titleTemplate: (title) => `${title} - Toneflix Collab`,
}));
</script>

<style lang="scss" scoped>
.notice {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(3, 191, 255, 0.08);
}

.history {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
</style>
