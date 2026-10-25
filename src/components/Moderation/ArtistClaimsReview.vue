<template>
  <div>
    <div class="flex flex-wrap gap-2 mb-4">
      <q-btn-toggle
        dense
        no-caps
        rounded
        unelevated
        toggle-color="toneflix"
        color="grey-10"
        class="!flex-none"
        :options="statusOptions"
        v-model="status"
      />
    </div>

    <div class="py-10 text-center" v-if="loading && !claims.length"><q-spinner size="md" /></div>
    <div class="py-12 text-center text-grey-5" v-else-if="!claims.length">
      <q-icon name="fas fa-circle-check" size="32px" class="mb-3" color="green-6" v-if="status === 'pending'" />
      <div>
        {{ search ? 'No claims match your search.' : status === 'pending' ? 'No artist claims waiting for review.' : 'Nothing here yet.' }}
      </div>
    </div>

    <div class="flex flex-col gap-3" v-else>
      <q-card flat bordered class="bg-dark" :key="claim.id" v-for="claim in claims">
        <q-card-section class="flex flex-col gap-3">
          <div
            role="button"
            tabindex="0"
            class="flex items-start justify-between gap-3 cursor-pointer select-none flex-nowrap"
            :aria-expanded="!!expanded[claim.id]"
            @click="toggle(claim.id)"
            @keydown.enter.prevent="toggle(claim.id)"
            @keydown.space.prevent="toggle(claim.id)"
          >
            <div class="flex items-center gap-3 flex-nowrap min-w-0">
              <q-avatar size="48px" class="!flex-none">
                <img :src="claim.artist?.imageUrl" :alt="claim.artist?.name" />
              </q-avatar>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <q-badge rounded color="grey-8" class="!flex-none" label="artist" />
                  <router-link
                    class="font-bold truncate hover:underline"
                    :to="{ name: 'artist', params: { artist_id: claim.artist.username } }"
                    v-if="claim.artist"
                    @click.stop
                  >
                    {{ claim.artist.name }}
                  </router-link>
                </div>
                <div class="text-xs text-grey-5">
                  {{ claim.artist?.unownedReleases || 0 }}
                  {{ claim.artist?.unownedReleases === 1 ? 'release' : 'releases' }} no one owns
                  <template v-if="claim.artist && !claim.artist.claimable"> · now managed by an account</template>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3 text-xs text-grey-5 !flex-none">
              {{ timeAgoStamp(claim.createdAt) }}
              <q-icon name="fas fa-chevron-down" size="12px" class="transition-transform" :class="{ 'rotate-180': expanded[claim.id] }" />
            </div>
          </div>

          <q-slide-transition>
            <div class="flex flex-col gap-3" v-show="expanded[claim.id]">
              <div class="report flex flex-col gap-2">
                <div class="text-xs text-grey-5">
                  <router-link class="underline" :to="{ name: 'admin.user', params: { id: claim.user.id } }" v-if="claim.user">
                    @{{ claim.user.username }}
                  </router-link>
                  · {{ claimRoleLabel(claim.role) }}
                </div>
                <div><b>{{ claim.name }}</b> · <a class="underline" :href="`mailto:${claim.email}`">{{ claim.email }}</a></div>
                <div class="whitespace-pre-line">{{ claim.message }}</div>
                <div class="flex flex-col gap-1">
                  <a
                    class="flex items-center gap-2 text-xs underline break-all flex-nowrap"
                    target="_blank"
                    rel="noopener noreferrer"
                    :href="link"
                    :key="link"
                    v-for="link in claim.links"
                  >
                    <q-icon name="fas fa-link" size="10px" class="!flex-none" /> {{ link }}
                  </a>
                </div>
                <div v-if="claim.hasDocument">
                  <q-btn
                    outline
                    rounded
                    no-caps
                    size="sm"
                    color="white"
                    icon="fas fa-paperclip"
                    label="Open supporting document"
                    class="!flex-none"
                    :loading="busy === `document:${claim.id}`"
                    @click="openDocument(claim)"
                  />
                </div>
              </div>

              <AiReviewStatus :review="claim.aiReview" v-if="claim.aiReview" />

              <div class="report" v-if="claim.status !== 'pending'">
                <div class="mb-1 text-xs text-grey-5">
                  {{ claim.status === 'approved' ? 'Approved' : 'Declined' }}
                  <template v-if="claim.reviewer"> by {{ claim.reviewer }}</template>
                  {{ timeAgoStamp(claim.reviewedAt || claim.createdAt) }}
                </div>
                {{ claim.reviewNote || 'No note.' }}
              </div>

              <template v-else>
                <q-input
                  dark
                  filled
                  dense
                  autogrow
                  counter
                  maxlength="2000"
                  label="Note to the claimant (needed to decline)"
                  v-model="notes[claim.id]"
                />
                <div class="flex flex-wrap gap-2">
                  <q-btn
                    unelevated
                    rounded
                    no-caps
                    size="sm"
                    color="green-9"
                    icon="fas fa-check"
                    label="Approve and link artist"
                    class="!flex-none"
                    :loading="busy === `approve:${claim.id}`"
                    @click="review(claim, 'approve')"
                  />
                  <q-btn
                    outline
                    rounded
                    no-caps
                    size="sm"
                    color="white"
                    icon="fas fa-xmark"
                    label="Decline"
                    class="!flex-none"
                    :disable="!notes[claim.id]?.trim()"
                    :loading="busy === `reject:${claim.id}`"
                    @click="review(claim, 'reject')"
                  />
                  <q-btn
                    outline
                    rounded
                    no-caps
                    size="sm"
                    color="purple-3"
                    icon="fas fa-wand-magic-sparkles"
                    label="Send to AI moderator"
                    class="!flex-none"
                    v-if="aiModerator"
                    :disable="claim.aiReview?.status === 'queued'"
                    :loading="busy === `ai:${claim.id}`"
                    @click="sendToAi(claim)"
                  />
                </div>
              </template>
            </div>
          </q-slide-transition>
        </q-card-section>
      </q-card>
    </div>

    <div class="flex justify-center mt-4" v-if="pages.lastPage > 1">
      <q-pagination dark color="toneflix" :max="pages.lastPage" :model-value="pages.page" @update:model-value="load" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { exportFile } from 'quasar';
import { reactive, ref, watch } from 'vue';
import { notify, timeAgoStamp } from 'src/utils/helpers';
import AiReviewStatus from 'src/components/Moderation/AiReviewStatus.vue';
import { useAiReviewPolling } from 'src/composables/useAiReviewPolling';
import {
  approveArtistClaimRequest,
  claimRoleLabel,
  downloadClaimDocumentRequest,
  loadArtistClaimsRequest,
  rejectArtistClaimRequest,
  sendClaimToAiRequest,
  type ArtistClaim,
} from 'src/utils/requests/artists';
import type { ModerationStats } from 'src/utils/requests/moderation';

const props = defineProps<{ search?: string | null }>();
const emit = defineEmits<{ stats: [stats: ModerationStats] }>();

const statusOptions = [
  { label: 'Waiting', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Declined', value: 'rejected' },
];

const status = ref<ArtistClaim['status']>('pending');
const claims = ref<ArtistClaim[]>([]);
const notes = reactive<Record<number, string>>({});
const expanded = reactive<Record<number, boolean>>({});
const pages = ref({ page: 1, lastPage: 1 });
const loading = ref(false);
const busy = ref<string | null>(null);
const aiModerator = ref(false);

const toggle = (id: number) => {
  expanded[id] = !expanded[id];
};

const load = async (page = 1) => {
  loading.value = true;

  try {
    const response = await loadArtistClaimsRequest({ status: status.value, search: props.search || undefined, page }).send();
    claims.value = response.data;
    pages.value = { page: response.meta?.current_page ?? 1, lastPage: response.meta?.last_page ?? 1 };
    aiModerator.value = !!response.stats.aiModerator;
    emit('stats', response.stats);
  } catch (error) {
    notify((error as Error).message, 'error');
  } finally {
    loading.value = false;
  }
};

const review = async (claim: ArtistClaim, action: 'approve' | 'reject') => {
  busy.value = `${action}:${claim.id}`;

  try {
    const { message } = action === 'approve'
      ? await approveArtistClaimRequest(claim.id, notes[claim.id]).send()
      : await rejectArtistClaimRequest(claim.id, notes[claim.id] || '').send();

    notify(message, 'success');
    await load(pages.value.page);
  } catch (error) {
    notify((error as Error).message, 'error');
  } finally {
    busy.value = null;
  }
};

const sendToAi = async (claim: ArtistClaim) => {
  busy.value = `ai:${claim.id}`;

  try {
    const { message } = await sendClaimToAiRequest(claim.id).send();
    notify(message, 'success');
    await load(pages.value.page);
  } catch (error) {
    notify((error as Error).message, 'error');
  } finally {
    busy.value = null;
  }
};

useAiReviewPolling(claims, () => load(pages.value.page));

const openDocument = async (claim: ArtistClaim) => {
  busy.value = `document:${claim.id}`;

  try {
    const blob = await downloadClaimDocumentRequest(claim.id).send();
    const extension = ({ 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg' } as Record<string, string>)[blob.type] || 'pdf';

    if (exportFile(`claim-${claim.id}-proof.${extension}`, blob) !== true) {
      notify('The document could not be opened.', 'error');
    }
  } catch {
    notify('The document could not be opened.', 'error');
  } finally {
    busy.value = null;
  }
};

watch([status, () => props.search], () => load(), { immediate: true });
</script>

<style scoped>
.report {
  padding: 0.75rem;
  font-size: 0.875rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.04);
}
</style>
