<template>
  <div>
    <SettingsCard title="Your invite link" :caption="termsLine">
      <BlockSkeleton variant="form" v-if="!summary" />

      <template v-else>
        <div class="invite-link">
          <span class="invite-link__url">{{ link }}</span>
          <q-btn
            flat
            round
            dense
            icon="lucide-copy"
            aria-label="Copy invite link"
            @click="copy"
          />
          <q-btn
            flat
            round
            dense
            icon="lucide-share-2"
            aria-label="Share invite link"
            @click="share"
            v-if="canShare"
          />
        </div>

        <q-form class="settings-card__grid mt-4" @submit="saveCode">
          <q-input
            outlined
            label="Invite code"
            maxlength="30"
            hint="Letters, numbers, - and _"
            v-model="code"
            :error="!!errors.code"
            :error-message="errors.code"
          />
          <div class="settings-card__actions">
            <q-btn
              unelevated
              rounded
              no-caps
              color="primary"
              type="submit"
              label="Save code"
              :disable="!code.trim() || code.trim().toLowerCase() === summary.code"
              :loading="saving === 'code'"
            />
          </div>
        </q-form>

        <div class="invite-stats">
          <div>
            <div class="invite-stats__value">{{ summary.invited }}</div>
            <div class="invite-stats__label">Joined</div>
          </div>
          <div>
            <div class="invite-stats__value">{{ price(summary.earned) }}</div>
            <div class="invite-stats__label">Earned</div>
          </div>
        </div>
      </template>
    </SettingsCard>

    <SettingsCard title="People you invited">
      <q-list separator v-if="invites.length">
        <q-item
          :key="person.id"
          :to="{ name: 'creator', params: { artist_id: person.username } }"
          v-for="person in invites"
        >
          <q-item-section avatar>
            <q-avatar color="grey-9" icon="lucide-user">
              <img :src="person.imageUrl" v-if="person.imageUrl" />
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label class="font-bold">{{ person.fullname || person.username }}</q-item-label>
            <q-item-label caption>Joined {{ joined(person.joinedAt) }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-item-label class="font-bold">{{ price(person.earned) }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
      <ListSkeleton side :rows="3" v-else-if="loading" />
      <SimpleInfo v-else text="Nobody has joined with your link yet." />

      <div class="flex justify-center mt-6" v-if="pageCount > 1">
        <q-pagination class="flex-none!" direction-links :max="pageCount" v-model="page" />
      </div>
    </SettingsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { copyToClipboard, date, useMeta } from 'quasar';
import { useWatcher } from 'alova/client';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import SettingsCard from 'src/components/Account/SettingsCard.vue';
import BlockSkeleton from 'src/components/Skeletons/BlockSkeleton.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import { usePayments } from 'src/composables/usePayments';
import { useSettingsForm } from 'src/composables/useSettingsForm';
import { notify } from 'src/utils/helpers';
import type { ReferralSummary } from 'src/utils/models';
import {
  inviteLink,
  loadInvitesRequest,
  loadReferralsRequest,
  saveReferralCodeRequest,
} from 'src/utils/requests/referrals';

useMeta({ title: 'Invites' });

const { price } = usePayments();
const { errors, saving, run } = useSettingsForm();

const summary = ref<ReferralSummary | null>(null);
const code = ref('');
const page = ref(1);
const canShare = ref(false);

const link = computed(() => (summary.value ? inviteLink(summary.value.code) : ''));

const termsLine = computed(() => {
  const terms = summary.value?.terms;

  if (!terms) {
    return undefined;
  }

  const period = terms.months ? ` for ${terms.months} months after they join` : '';

  return `People who join with it earn you ${terms.rate}% of what Toneflix Music keeps from their payments${period}.`;
});

const { data, loading } = useWatcher(
  () => loadInvitesRequest({ page: page.value, limit: 20 }),
  [page],
  { immediate: true },
);

const invites = computed(() => data.value?.data || []);
const pageCount = computed(() => data.value?.meta?.lastPage || 1);

const joined = (at: string) => date.formatDate(at, 'MMM D, YYYY');

onMounted(async () => {
  canShare.value = typeof navigator !== 'undefined' && !!navigator.share;

  const body = await loadReferralsRequest().send();

  summary.value = body.data;
  code.value = body.data.code;
});

const copy = () => void copyToClipboard(link.value).then(() => notify('Link copied.', 'success'));

const share = () =>
  void navigator
    .share({ title: 'Join me on Toneflix Music', url: link.value })
    .catch(() => undefined);

const saveCode = () =>
  run('code', 'We could not save your code.', async () => {
    const body = await saveReferralCodeRequest(code.value.trim()).send();

    summary.value = body.data;
    code.value = body.data.code;
    notify(body.message, 'success');
  });
</script>

<style lang="scss" scoped>
.invite-link {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px;
  padding: 8px 8px 8px 14px;
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-lg);
  background: var(--tf-surface-2);

  > * {
    flex: none;
  }

  &__url {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    font-family: var(--tf-font-mono, monospace);
    font-size: 0.9rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.invite-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;

  &__value {
    font-size: 1.4rem;
    font-weight: 700;
  }

  &__label {
    font-size: 0.8rem;
    color: var(--tf-text-muted);
  }
}
</style>
