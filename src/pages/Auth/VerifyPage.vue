<template>
  <AuthShell>
    <div class="auth-done" v-if="done">
      <q-icon name="lucide-circle-check" size="48px" />
      <h1 class="auth-title">{{ t('done_title') }}</h1>
      <p class="auth-subtitle">{{ t('done_text') }}</p>
      <q-btn
        unelevated
        no-caps
        color="primary"
        text-color="dark"
        class="mt-2 auth-submit"
        :label="t('done_button')"
        @click="next"
      />
    </div>

    <template v-else>
      <span class="verify-icon">
        <q-icon :name="type === 'phone' ? 'lucide-smartphone' : 'lucide-mail'" size="22px" />
      </span>
      <h1 class="auth-title">{{ t(`${type}_title`) }}</h1>
      <p class="auth-subtitle">{{ t('subtitle', { target }) }}</p>

      <q-form class="auth-form" @submit="verify">
        <div>
          <OtpInput :error="!!error" :disabled="loading" v-model="code" @complete="nextTick(verify)" />
          <div class="mt-2 auth-error" v-if="error">{{ error }}</div>
        </div>

        <q-btn
          unelevated
          no-caps
          type="submit"
          color="primary"
          text-color="dark"
          class="auth-submit"
          :label="t('submit')"
          :loading="loading"
          :disable="code.length < 6"
        />

        <div class="auth-row">
          <q-btn
            flat
            dense
            no-caps
            color="primary"
            class="!flex-none"
            :label="wait > 0 ? t('resend_wait', { seconds: wait }) : t('resend')"
            :disable="wait > 0"
            :loading="sending"
            @click="resend"
          />
          <router-link class="text-sm text-fg-muted hover:text-white" :to="{ name: 'auth.logout' }">
            {{ t('switch_account') }}
          </router-link>
        </div>
      </q-form>
    </template>
  </AuthShell>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import AuthShell from 'src/components/Auth/AuthShell.vue';
import OtpInput from 'src/components/Auth/OtpInput.vue';
import { alova } from 'src/boot/alova';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { authText, pendingVerification, type VerificationType } from 'src/utils/auth-pages';
import { safeRedirect } from 'src/utils/auth-redirect';
import { notify } from 'src/utils/helpers';
import { ResponseBody, User } from 'src/utils/models';

type VerifyBody = ResponseBody<User> & { try_at?: string };

const boot = useBootstrapStore();
const route = useRoute();
const router = useRouter();
const t = (key: string, values?: Record<string, string | number>) => authText('verify', key, values);

const type = computed<VerificationType>(() => (route.params.type === 'phone' ? 'phone' : 'email'));
const target = computed(() => (type.value === 'phone' ? boot.user.phone : boot.user.email) || '');
const code = ref('');
const error = ref('');
const loading = ref(false);
const sending = ref(false);
const done = ref(false);
const resendAt = ref(0);
const now = ref(Date.now());
const wait = computed(() => Math.max(0, Math.ceil((resendAt.value - now.value) / 1000)));

let timer: ReturnType<typeof setInterval> | undefined;

const track = (body?: VerifyBody) => {
  if (body?.data?.id) {
    boot.setUser({ ...boot.user, ...body.data });
  }

  resendAt.value = body?.try_at ? new Date(body.try_at).getTime() : 0;
};

const verify = async () => {
  if (loading.value || code.value.length < 6) {
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const body = await alova.Put<VerifyBody>(`verify/with-code/${type.value}`, { code: code.value }).send();

    track(body);
    done.value = true;
  } catch (e) {
    const body = e as ResponseBody<string>;

    error.value = body?.errors?.code || body?.message || '';
    code.value = '';
  } finally {
    loading.value = false;
  }
};

const resend = async () => {
  sending.value = true;

  try {
    const body = await alova.Post<VerifyBody>(`verify/with-code/${type.value}`).send();

    track(body);
    notify(body.message, 'success');
  } catch (e) {
    track(e as VerifyBody);
  } finally {
    sending.value = false;
  }
};

const next = () => {
  const pending = pendingVerification(boot.user, boot.configuration);
  const redirect = safeRedirect(route.query.redirect);

  if (pending) {
    done.value = false;
    code.value = '';

    return router.replace({ name: 'auth.verify', params: { type: pending }, query: route.query });
  }

  return router.replace(redirect ?? { name: 'studio.home' });
};

const status = async () => {
  try {
    const body = await alova.Get<VerifyBody>(`verify/with-code/${type.value}`, { cacheFor: 0 }).send();

    track(body);

    if (type.value === 'phone' ? body.data?.phoneVerifiedAt : body.data?.emailVerifiedAt) {
      void next();
    }
  } catch {
    // The page still works without the status.
  }
};

watch(type, () => {
  done.value = false;
  void status();
});

onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 1000);

  const linked = route.query.code;

  if (typeof linked === 'string' && /^\d{6}$/.test(linked)) {
    code.value = linked;
    void verify();
  } else {
    void status();
  }
});

onBeforeUnmount(() => clearInterval(timer));

useMeta(() => ({ title: t(`${type.value}_title`) || 'Verify', titleTemplate: (title) => `${title} - Toneflix Music` }));
</script>

<style lang="scss" scoped>
.verify-icon {
  display: inline-grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  border-radius: var(--tf-radius-lg);
  color: var(--tf-primary);
  background: var(--tf-primary-soft);
}
</style>
