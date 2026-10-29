<template>
  <AuthShell>
    <template v-if="invite">
      <h1 class="auth-title">Join the royalty program</h1>
      <p class="auth-subtitle">
        {{ invite.name }}, invite people to join Toneflix Music with your link
        and earn {{ invite.rate }}% of what we keep from their payments{{
          invite.months ? ` for ${invite.months} months after they join` : ''
        }}.
      </p>

      <div class="auth-form" v-if="invite.status === 'pending'">
        <q-btn
          unelevated
          no-caps
          color="primary"
          text-color="dark"
          class="auth-submit"
          label="Accept the invite"
          :loading="accepting"
          @click="accept"
          v-if="signedIn"
        />
        <template v-else>
          <q-btn
            unelevated
            no-caps
            color="primary"
            text-color="dark"
            class="auth-submit"
            label="Create your account"
            :to="{ name: 'auth.register', query: { royalty: token } }"
          />
          <q-btn
            outline
            no-caps
            class="auth-submit"
            label="I have an account"
            :to="{ name: 'auth.login', query: { redirect: route.fullPath } }"
          />
        </template>
        <p class="text-sm text-fg-muted">Use {{ invite.email }}, the address this invite was sent to.</p>
      </div>

      <p class="auth-error" v-else>{{ closedText[invite.status] }}</p>
    </template>

    <p class="auth-error" v-else-if="missing">This invite link is not valid.</p>
    <q-spinner size="28px" v-else />
  </AuthShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import AuthShell from 'src/components/Auth/AuthShell.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import { payoutError } from 'src/utils/requests/payouts';
import {
  acceptRoyaltyInviteRequest,
  loadRoyaltyInviteRequest,
  RoyaltyInvite,
  RoyaltyInviteStatus,
} from 'src/utils/requests/royalties';

useMeta({ title: 'Royalty invite', titleTemplate: (title) => `${title} - Toneflix Music` });

const route = useRoute();
const router = useRouter();
const boot = useBootstrapStore();

const token = String(route.params.token);
const invite = ref<RoyaltyInvite | null>(null);
const missing = ref(false);
const accepting = ref(false);

const signedIn = computed(() => !!boot.user?.id);

const closedText: Record<RoyaltyInviteStatus, string> = {
  pending: '',
  accepted: 'This invite has been accepted.',
  cancelled: 'This invite was cancelled.',
  expired: 'This invite has expired. Ask us to send it again.',
};

onMounted(() => {
  loadRoyaltyInviteRequest(token)
    .send()
    .then(({ data }) => (invite.value = data))
    .catch(() => (missing.value = true));
});

const accept = async () => {
  accepting.value = true;

  try {
    const body = await acceptRoyaltyInviteRequest(token).send();

    notify(body.message, 'success');
    void router.replace({ name: 'account.invites' });
  } catch (e) {
    notify(payoutError(e, 'The invite couldn\'t be accepted.'), 'error');
  } finally {
    accepting.value = false;
  }
};
</script>
