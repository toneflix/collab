<template>
  <div>
    <div class="flex flex-wrap items-center gap-3 mb-2">
      <q-input
        dark
        dense
        outlined
        clearable
        debounce="400"
        class="min-w-56"
        :placeholder="view === 'invites' ? 'Search name or email' : 'Search username or email'"
        v-model="search"
      >
        <template #prepend><q-icon name="lucide-search" /></template>
      </q-input>
      <q-select
        dark
        dense
        outlined
        emit-value
        map-options
        class="flex-none! min-w-36"
        :options="statusOptions"
        v-model="status"
      />
      <q-btn
        unelevated
        rounded
        no-caps
        color="toneflix"
        icon="lucide-user-plus"
        label="Invite a royal"
        class="flex-none! ml-auto"
        @click="openInvite"
      />
    </div>

    <template v-if="view === 'invites'">
      <q-list separator v-if="invites.length">
        <q-item :key="invite.id" v-for="invite in invites">
          <q-item-section avatar>
            <q-avatar color="grey-9" icon="lucide-mail" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="font-bold">{{ invite.name }}</q-item-label>
            <q-item-label caption>
              {{ invite.email }}{{ invite.hasAccount ? ' · has an account' : '' }}
            </q-item-label>
            <q-item-label caption>
              {{ termsLine(invite) }}{{ invite.code ? ` · code ${invite.code}` : '' }}
              · {{ statusLabel(invite) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side v-if="invite.status === 'pending' || invite.status === 'expired'">
            <div class="flex items-center gap-1 no-wrap">
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                label="Send again"
                class="flex-none!"
                :loading="busy === `resend-${invite.id}`"
                @click="resend(invite)"
              />
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                color="red-4"
                label="Cancel"
                class="flex-none!"
                :loading="busy === `cancel-${invite.id}`"
                @click="cancel(invite)"
              />
            </div>
          </q-item-section>
        </q-item>
      </q-list>
      <ListSkeleton side v-else-if="loading" />
      <SimpleInfo v-else text="No invites here." />
    </template>

    <template v-else>
      <q-list separator v-if="contracts.length">
        <q-item :key="contract.id" v-for="contract in contracts">
          <q-item-section avatar>
            <q-avatar color="grey-9" icon="lucide-user">
              <img :src="contract.user.imageUrl" v-if="contract.user?.imageUrl" />
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label class="font-bold">
              {{ contract.user?.fullname || contract.user?.username }}
            </q-item-label>
            <q-item-label caption>
              {{ termsLine(contract) }}
              <template v-if="contract.user?.code"> · code {{ contract.user.code }}</template>
              · {{ contract.active ? `since ${day(contract.startsAt)}` : `ended ${day(contract.endsAt)}` }}
            </q-item-label>
            <q-item-label caption>
              {{ contract.invited ?? 0 }} joined · {{ price(contract.earned) }} earned on these terms
            </q-item-label>
            <q-item-label caption class="italic" v-if="contract.note">{{ contract.note }}</q-item-label>
          </q-item-section>
          <q-item-section side v-if="contract.active">
            <div class="flex items-center gap-1 no-wrap">
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                label="Change"
                class="flex-none!"
                @click="openChange(contract)"
              />
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                color="red-4"
                label="End"
                class="flex-none!"
                :loading="busy === `end-${contract.id}`"
                @click="end(contract)"
              />
            </div>
          </q-item-section>
        </q-item>
      </q-list>
      <ListSkeleton side v-else-if="loading" />
      <SimpleInfo v-else text="No royals here yet." />
    </template>

    <div class="flex justify-center mt-8" v-if="pageCount > 1">
      <q-pagination class="flex-none!" direction-links :max="pageCount" v-model="page" />
    </div>

    <RoyaltyTermsDialog :contract="editing" @saved="reload" v-model="dialog" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { date, useQuasar } from 'quasar';
import { useWatcher } from 'alova/client';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import RoyaltyTermsDialog from 'src/components/Payments/RoyaltyTermsDialog.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import { usePayments } from 'src/composables/usePayments';
import { notify } from 'src/utils/helpers';
import { payoutError } from 'src/utils/requests/payouts';
import {
  cancelRoyaltyInviteRequest,
  endRoyaltyContractRequest,
  loadRoyaltyListRequest,
  resendRoyaltyInviteRequest,
  RoyaltyContract,
  RoyaltyInvite,
  termsLine,
} from 'src/utils/requests/royalties';

const props = defineProps<{
  view: 'contracts' | 'invites';
}>();

const $q = useQuasar();
const { price } = usePayments();

const search = ref<string | null>('');
const status = ref('');
const page = ref(1);
const busy = ref<string>();
const dialog = ref(false);
const editing = ref<RoyaltyContract | null>(null);

const statusOptions = computed(() =>
  props.view === 'invites'
    ? [
        { label: 'All', value: '' },
        { label: 'Open', value: 'pending' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Expired', value: 'expired' },
        { label: 'Cancelled', value: 'cancelled' },
      ]
    : [
        { label: 'All', value: '' },
        { label: 'Active', value: 'active' },
        { label: 'Ended', value: 'ended' },
      ],
);

watch(
  () => props.view,
  () => {
    status.value = '';
    page.value = 1;
  },
);
watch([status, search], () => (page.value = 1));

const { data, loading, send: reload } = useWatcher(
  () => loadRoyaltyListRequest(props.view, { status: status.value, search: search.value || '', page: page.value }),
  [() => props.view, status, search, page],
  { immediate: true },
);

const invites = computed(() => (props.view === 'invites' ? (data.value?.data as RoyaltyInvite[]) || [] : []));
const contracts = computed(() => (props.view === 'contracts' ? (data.value?.data as RoyaltyContract[]) || [] : []));
const pageCount = computed(() => data.value?.meta?.lastPage || 1);

const day = (at?: string | null) => (at ? date.formatDate(at, 'MMM D, YYYY') : '');

const statusLabel = (invite: RoyaltyInvite) =>
  ({
    pending: `open until ${day(invite.expiresAt)}`,
    accepted: `accepted ${day(invite.acceptedAt)}`,
    cancelled: 'cancelled',
    expired: `expired ${day(invite.expiresAt)}`,
  })[invite.status];

const openInvite = () => {
  editing.value = null;
  dialog.value = true;
};

const openChange = (contract: RoyaltyContract) => {
  editing.value = contract;
  dialog.value = true;
};

const act = async (key: string, request: () => Promise<{ message: string }>, fallback: string) => {
  busy.value = key;

  try {
    const body = await request();

    notify(body.message, 'success');
    void reload();
  } catch (e) {
    notify(payoutError(e, fallback), 'error');
  } finally {
    busy.value = undefined;
  }
};

const resend = (invite: RoyaltyInvite) =>
  act(`resend-${invite.id}`, () => resendRoyaltyInviteRequest(Number(invite.id)).send(), 'The invite wasn\'t sent.');

const cancel = (invite: RoyaltyInvite) =>
  act(`cancel-${invite.id}`, () => cancelRoyaltyInviteRequest(Number(invite.id)).send(), 'The invite wasn\'t cancelled.');

const end = (contract: RoyaltyContract) => {
  $q.dialog({
    dark: true,
    title: 'End this contract?',
    message: 'People they invited earn them the standard invite reward from now on.',
    prompt: { model: '', type: 'text', outlined: true, dark: true, label: 'Reason (optional)', maxlength: 500 },
    cancel: { flat: true, noCaps: true, label: 'Keep it' },
    ok: { unelevated: true, rounded: true, noCaps: true, color: 'red-8', label: 'End contract' },
  }).onOk((reason: string) =>
    void act(
      `end-${contract.id}`,
      () => endRoyaltyContractRequest(contract.id, reason || undefined).send(),
      'The contract wasn\'t ended.',
    ),
  );
};
</script>
