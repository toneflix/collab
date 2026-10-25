<template>
  <q-page padding>
    <div class="max-w-3xl mx-auto">
      <div class="py-4">
        <h1 class="text-3xl font-circlular-std">Moderation</h1>
        <p class="text-grey-5">
          Reported content, tracks the audio check flagged as copies, and tracks whose lyrics need a look. Taking something down hides it from everyone
          but its owner, and tells the owner and the people who reported it.
        </p>
      </div>

      <q-tabs dense no-caps align="left" class="mb-4" active-color="toneflix" v-model="tab">
        <q-tab name="queue">
          <div class="flex items-center gap-2 flex-nowrap">
            Queue <q-badge rounded color="toneflix" :label="meta.pending" v-if="meta.pending" />
          </div>
        </q-tab>
        <q-tab name="appealed">
          <div class="flex items-center gap-2 flex-nowrap">
            Appeals <q-badge rounded color="orange-9" :label="meta.appeals" v-if="meta.appeals" />
          </div>
        </q-tab>
        <q-tab name="active" label="Taken down" />
        <q-tab name="restored" label="Restored" />
      </q-tabs>

      <template v-if="tab === 'queue'">
        <div class="flex flex-wrap gap-2 mb-4">
          <q-select
            dark
            dense
            outlined
            emit-value
            map-options
            class="min-w-36 !flex-none"
            label="Content"
            :options="typeOptions"
            v-model="filters.type"
          />
          <q-select
            dark
            dense
            outlined
            emit-value
            map-options
            class="min-w-36 !flex-none"
            label="From"
            :options="sourceOptions"
            v-model="filters.source"
          />
        </div>

        <div class="py-10 text-center" v-if="loading && !queue.length"><q-spinner size="md" /></div>
        <div class="py-12 text-center text-grey-5" v-else-if="!queue.length">
          <q-icon name="fas fa-circle-check" size="32px" class="mb-3" color="green-6" />
          <div>Nothing waiting for review.</div>
        </div>

        <div class="flex flex-col gap-3" v-else>
          <q-card flat bordered class="bg-dark" :key="row.key" v-for="row in queue">
            <q-card-section class="flex flex-col gap-3">
              <div class="flex items-start justify-between gap-3 flex-nowrap">
                <ModeratedItemRow show-owner :item="row.item" v-if="row.item" />
                <div class="text-grey-5" v-else>This content was deleted.</div>
                <div class="text-xs text-right text-grey-5 !flex-none">
                  {{ row.reportsCount }} {{ row.reportsCount === 1 ? 'report' : 'reports' }}<br />
                  {{ timeAgoStamp(row.lastReportedAt) }}
                </div>
              </div>

              <div class="flex flex-wrap gap-1">
                <q-chip
                  dense
                  square
                  class="!flex-none"
                  text-color="white"
                  :color="isCopyrightReason(reason) ? 'red-10' : 'grey-9'"
                  :key="reason"
                  v-for="(count, reason) in row.reasons"
                >
                  {{ reasonLabel(reason) }}<template v-if="(count || 0) > 1"> × {{ count }}</template>
                </q-chip>
              </div>

              <div class="flex flex-col gap-2">
                <div class="report" :key="report.id" v-for="report in row.reports">
                  <template v-if="report.type === 'match'">
                    <div class="flex items-center gap-2 mb-1 text-xs text-grey-5">
                      <q-icon name="fas fa-wave-square" color="orange-6" class="!flex-none" />
                      <span>
                        Audio check · {{ report.claim?.kind === 'exact' ? 'same file' : 'sounds the same' }} ·
                        {{ Math.round((report.claim?.score || 0) * 100) }}% match
                      </span>
                    </div>
                    Sounds like
                    <router-link class="font-bold underline" :to="report.claim?.match_link || ''" v-if="report.claim?.match_link">
                      {{ report.claim?.match_title }}
                    </router-link>
                    <b v-else>{{ report.claim?.match_title }}</b>
                    by {{ report.claim?.match_artist || 'another creator' }}, uploaded earlier.
                  </template>
                  <template v-else-if="report.type === 'lyrics'">
                    <div class="flex items-center gap-2 mb-1 text-xs text-grey-5">
                      <q-icon name="fas fa-align-left" color="orange-6" class="!flex-none" />
                      <span>Lyrics check · {{ timeAgoStamp(report.createdAt) }}</span>
                    </div>
                    The lyrics use words to review:
                    <b>{{ (report.claim?.words || []).join(', ') }}</b>
                  </template>
                  <template v-else>
                    <div class="mb-1 text-xs text-grey-5">
                      {{ report.user?.name || 'Someone' }} · {{ reasonLabel(report.reason) }} · {{ timeAgoStamp(report.createdAt) }}
                    </div>
                    <div v-if="report.details">{{ report.details }}</div>
                    <div class="mt-1 text-xs text-grey-4" v-if="report.claim?.claimant">
                      Rights owner: {{ report.claim.claimant }}
                      <template v-if="report.claim.email"> · {{ report.claim.email }}</template>
                      <template v-if="report.claim.original_url">
                        ·
                        <a class="underline" target="_blank" rel="noopener" :href="report.claim.original_url">original</a>
                      </template>
                    </div>
                  </template>
                </div>
                <div class="text-xs text-grey-5" v-if="row.reportsCount > row.reports.length">
                  And {{ row.reportsCount - row.reports.length }} more.
                </div>
              </div>

              <div class="flex flex-wrap gap-2" v-if="row.item">
                <q-btn
                  unelevated
                  rounded
                  no-caps
                  size="sm"
                  color="red-9"
                  icon="fas fa-ban"
                  label="Take down"
                  class="!flex-none"
                  v-if="row.item.canTakeDown && !row.item.takenDown"
                  @click="openTakedown(row)"
                />
                <q-btn
                  outline
                  rounded
                  no-caps
                  size="sm"
                  color="white"
                  icon="fas fa-check"
                  label="Mark handled"
                  class="!flex-none"
                  v-if="!row.item.canTakeDown || row.item.takenDown"
                  :loading="busy === `resolve:${row.key}`"
                  @click="close(row, 'resolve')"
                />
                <q-btn
                  outline
                  rounded
                  no-caps
                  size="sm"
                  color="white"
                  icon="fas fa-xmark"
                  label="Dismiss"
                  class="!flex-none"
                  :loading="busy === `dismiss:${row.key}`"
                  @click="close(row, 'dismiss')"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </template>

      <template v-else>
        <div class="py-10 text-center" v-if="loading && !takedowns.length"><q-spinner size="md" /></div>
        <div class="py-12 text-center text-grey-5" v-else-if="!takedowns.length">
          {{ tab === 'appealed' ? 'No appeals waiting.' : 'Nothing here yet.' }}
        </div>

        <div class="flex flex-col gap-3" v-else>
          <q-card flat bordered class="bg-dark" :key="takedown.id" v-for="takedown in takedowns">
            <q-card-section class="flex flex-col gap-3">
              <ModeratedItemRow show-owner hide-status :item="takedown.item" v-if="takedown.item" />
              <div class="text-sm">
                Taken down {{ timeAgoStamp(takedown.createdAt) }} for <b>{{ reasonLabel(takedown.reason) }}</b>
                <template v-if="takedown.moderator"> by {{ takedown.moderator.name }}</template>.
                <span class="text-grey-4" v-if="takedown.note">{{ takedown.note }}</span>
              </div>
              <div class="report" v-if="takedown.appeal">
                <div class="mb-1 text-xs text-grey-5">Appeal from the owner, {{ timeAgoStamp(takedown.appealedAt || takedown.createdAt) }}</div>
                {{ takedown.appeal }}
              </div>
              <div class="report" v-if="takedown.resolvedAt">
                <div class="mb-1 text-xs text-grey-5">
                  {{ takedown.status === 'restored' ? 'Restored' : 'Appeal declined' }} {{ timeAgoStamp(takedown.resolvedAt) }}
                </div>
                {{ takedown.resolution || 'No note.' }}
              </div>

              <template v-if="takedown.status !== 'restored'">
                <q-input
                  dark
                  filled
                  dense
                  autogrow
                  label="Note to the owner (optional)"
                  v-model="resolutions[takedown.id]"
                />
                <div class="flex flex-wrap gap-2">
                  <q-btn
                    unelevated
                    rounded
                    no-caps
                    size="sm"
                    color="green-9"
                    icon="fas fa-rotate-left"
                    label="Restore"
                    class="!flex-none"
                    :loading="busy === `restore:${takedown.id}`"
                    @click="decide(takedown, 'restore')"
                  />
                  <q-btn
                    outline
                    rounded
                    no-caps
                    size="sm"
                    color="white"
                    label="Keep it down"
                    class="!flex-none"
                    v-if="takedown.status === 'appealed'"
                    :loading="busy === `uphold:${takedown.id}`"
                    @click="decide(takedown, 'uphold')"
                  />
                </div>
              </template>
            </q-card-section>
          </q-card>
        </div>
      </template>

      <div class="flex justify-center mt-4" v-if="pages.lastPage > 1">
        <q-pagination dark color="toneflix" :max="pages.lastPage" :model-value="pages.page" @update:model-value="load" />
      </div>
    </div>

    <q-dialog v-model="takedownDialog">
      <q-card class="w-full max-w-sm bg-dark">
        <q-card-section>
          <div class="text-lg font-bold">Take down “{{ selected?.item?.title }}”</div>
          <div class="text-xs text-grey-5">
            It will be hidden from everyone but its owner, who can appeal once.
          </div>
        </q-card-section>
        <q-card-section class="flex flex-col gap-3 pt-0">
          <q-select dark filled dense emit-value map-options label="Reason" :options="reportReasons" v-model="takedownForm.reason" />
          <q-input
            dark
            filled
            dense
            autogrow
            counter
            maxlength="2000"
            label="Note to the owner (optional)"
            v-model="takedownForm.note"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn unelevated rounded no-caps color="red-9" label="Take down" :loading="busy === 'takedown'" @click="takeDown" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { useMeta } from 'quasar';
import { reactive, ref, watch } from 'vue';
import ModeratedItemRow from 'src/components/Moderation/ModeratedItemRow.vue';
import { notify, timeAgoStamp } from 'src/utils/helpers';
import {
  dismissReportsRequest,
  isCopyrightReason,
  loadAdminTakedownsRequest,
  loadModerationQueueRequest,
  reasonLabel,
  reportReasons,
  resolveReportsRequest,
  restoreTakedownRequest,
  takeDownRequest,
  upholdTakedownRequest,
  type ModerationMeta,
  type QueueItem,
  type ReportReason,
  type Takedown,
} from 'src/utils/requests/moderation';

const typeOptions = [
  { label: 'Everything', value: '' },
  { label: 'Releases', value: 'release' },
  { label: 'Tracks', value: 'track' },
  { label: 'Sounds', value: 'sound' },
  { label: 'Comments', value: 'comment' },
  { label: 'Accounts', value: 'user' },
];

const sourceOptions = [
  { label: 'Reports and checks', value: '' },
  { label: 'People\'s reports', value: 'report' },
  { label: 'Audio check', value: 'match' },
  { label: 'Lyrics check', value: 'lyrics' },
];

const tab = ref<'queue' | Takedown['status']>('queue');
const filters = reactive({ type: '', source: '' });
const queue = ref<QueueItem[]>([]);
const takedowns = ref<Takedown[]>([]);
const meta = ref<ModerationMeta>({ total: 0, page: 1, lastPage: 1, pending: 0, appeals: 0 });
const pages = ref({ page: 1, lastPage: 1 });
const loading = ref(false);
const busy = ref<string | null>(null);
const resolutions = reactive<Record<number, string>>({});

const takedownDialog = ref(false);
const selected = ref<QueueItem | null>(null);
const takedownForm = reactive({ reason: 'copyright' as ReportReason, note: '' });

const load = async (page = 1) => {
  loading.value = true;

  try {
    if (tab.value === 'queue') {
      const response = await loadModerationQueueRequest({ ...filters, page }).send();
      queue.value = response.data;
      meta.value = response.meta;
    } else {
      const response = await loadAdminTakedownsRequest({ status: tab.value, page }).send();
      takedowns.value = response.data;
      meta.value = response.meta;
    }

    pages.value = { page: meta.value.page, lastPage: meta.value.lastPage };
  } catch (error) {
    notify((error as Error).message, 'error');
  } finally {
    loading.value = false;
  }
};

const run = async (key: string, action: () => Promise<{ message: string }>) => {
  busy.value = key;

  try {
    const { message } = await action();
    notify(message, 'success');
    await load(pages.value.page);
  } catch (error) {
    notify((error as Error).message, 'error');
  } finally {
    busy.value = null;
  }
};

const openTakedown = (row: QueueItem) => {
  const top = Object.entries(row.reasons).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0]?.[0] as ReportReason | undefined;

  selected.value = row;
  takedownForm.reason = top || 'copyright';
  takedownForm.note = '';
  takedownDialog.value = true;
};

const takeDown = async () => {
  const item = selected.value?.item;
  if (!item) return;

  await run('takedown', () => takeDownRequest(item.type, item.id, { ...takedownForm }).send());
  takedownDialog.value = false;
};

const close = (row: QueueItem, action: 'dismiss' | 'resolve') => {
  const item = row.item;
  if (!item) return;

  const request = action === 'dismiss' ? dismissReportsRequest : resolveReportsRequest;
  run(`${action}:${row.key}`, () => request(item.type, item.id).send());
};

const decide = (takedown: Takedown, action: 'restore' | 'uphold') => {
  const request = action === 'restore' ? restoreTakedownRequest : upholdTakedownRequest;
  run(`${action}:${takedown.id}`, () => request(takedown.id, resolutions[takedown.id] || undefined).send());
};

watch([tab, () => filters.type, () => filters.source], () => load(), { immediate: true });

useMeta({ title: 'Moderation - Admin' });
</script>

<style scoped>
.report {
  padding: 0.75rem;
  font-size: 0.875rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.04);
}
</style>
