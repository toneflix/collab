<template>
  <AuthShell>
    <ol class="auth-steps" :aria-label="`Step ${step} of 3`">
      <li
        class="auth-steps__item"
        :class="{ 'auth-steps__item--on': index + 1 <= step }"
        :aria-current="index + 1 === step ? 'step' : undefined"
        :key="item"
        v-for="(item, index) in steps"
      >
        <button type="button" :disabled="index + 1 >= step" @click="step = index + 1">
          {{ item }}
        </button>
      </li>
    </ol>

    <!-- Step 1: account type -->
    <template v-if="step === 1">
      <h1 class="auth-title">{{ t('title') }}</h1>
      <p class="auth-subtitle" v-if="t('subtitle')">{{ t('subtitle') }}</p>

      <q-form class="auth-form" @submit="step = 2">
        <AccountTypePicker v-model="form.account_type" />
        <div class="auth-error" v-if="errors.account_type">{{ errors.account_type }}</div>

        <q-btn
          unelevated
          no-caps
          type="submit"
          color="primary"
          text-color="dark"
          class="auth-submit"
          :label="t('next')"
          :disable="!form.account_type"
        />
      </q-form>
    </template>

    <!-- Step 2: who they are -->
    <template v-else-if="step === 2">
      <h1 class="auth-title">{{ t('identity_title') }}</h1>
      <p class="auth-subtitle" v-if="t('identity_subtitle')">{{ t('identity_subtitle') }}</p>

      <q-form class="auth-form" @submit="step = 3">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="auth-label" for="register-firstname">{{ t('firstname_label') }}</label>
            <q-input
              outlined
              hide-bottom-space
              for="register-firstname"
              autocomplete="given-name"
              :placeholder="t('firstname_placeholder')"
              :rules="[required]"
              :error="!!errors.firstname"
              :error-message="errors.firstname"
              v-model="form.firstname"
            />
          </div>
          <div>
            <label class="auth-label" for="register-lastname">{{ t('lastname_label') }}</label>
            <q-input
              outlined
              hide-bottom-space
              for="register-lastname"
              autocomplete="family-name"
              :placeholder="t('lastname_placeholder')"
              :rules="[required]"
              :error="!!errors.lastname"
              :error-message="errors.lastname"
              v-model="form.lastname"
            />
          </div>
        </div>

        <div v-if="identityOptions.length">
          <span class="auth-label">{{ t(`identities_${form.account_type}_label`) }}</span>
          <p class="mb-3 text-sm text-fg-muted" v-if="t('identities_hint')">{{ t('identities_hint') }}</p>
          <ChoiceChips :options="identityOptions" :max="6" v-model="form.identities" />
          <div class="mt-1 auth-error" v-if="identityError">{{ identityError }}</div>
        </div>

        <div class="auth-step-actions">
          <q-btn flat no-caps class="auth-back" icon="lucide-arrow-left" :label="t('back')" @click="step = 1" />
          <q-btn
            unelevated
            no-caps
            type="submit"
            color="primary"
            text-color="dark"
            class="auth-submit"
            :label="t('next')"
          />
        </div>
      </q-form>
    </template>

    <!-- Step 3: sign-in details -->
    <template v-else>
      <h1 class="auth-title">{{ t('access_title') }}</h1>
      <p class="auth-subtitle" v-if="t('access_subtitle')">{{ t('access_subtitle') }}</p>

      <q-form class="auth-form" @submit="submit">
        <div>
          <label class="auth-label" for="register-email">{{ t('email_label') }}</label>
          <q-input
            outlined
            hide-bottom-space
            required
            for="register-email"
            type="email"
            autocomplete="email"
            :placeholder="t('email_placeholder')"
            :error="!!errors.email"
            :error-message="errors.email"
            v-model="form.email"
          />
        </div>

        <div>
          <label class="auth-label" for="register-phone">{{ t('phone_label') }}</label>
          <q-input
            outlined
            hide-bottom-space
            for="register-phone"
            type="tel"
            autocomplete="tel"
            :placeholder="t('phone_placeholder')"
            :error="!!errors.phone"
            :error-message="errors.phone"
            v-model="form.phone"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="auth-label" for="register-password">{{ t('password_label') }}</label>
            <PasswordInput
              required
              for="register-password"
              autocomplete="new-password"
              :placeholder="t('password_placeholder')"
              :error="!!errors.password"
              :error-message="errors.password"
              v-model="form.password"
            />
          </div>
          <div>
            <label class="auth-label" for="register-confirm">{{ t('password_confirm_label') }}</label>
            <PasswordInput
              required
              for="register-confirm"
              autocomplete="new-password"
              :placeholder="t('password_confirm_placeholder')"
              :error="!!errors.password_confirmation"
              :error-message="errors.password_confirmation"
              v-model="form.password_confirmation"
            />
          </div>
        </div>

        <div>
          <div class="flex items-start gap-2 no-wrap">
            <q-checkbox dense color="primary" class="flex-none! mt-0.5" v-model="form.accept" />
            <p class="m-0 text-sm leading-relaxed text-fg-muted">
              <span class="cursor-pointer" @click="form.accept = !form.accept">{{ t('terms_before') }}</span>
              {{ ' ' }}
              <router-link class="auth-link" target="_blank" :to="{ name: 'terms' }">{{ t('terms_link') }}</router-link>
              {{ ` ${t('terms_between')} ` }}
              <router-link class="auth-link" target="_blank" :to="{ name: 'privacy' }">{{ t('privacy_link') }}</router-link>
            </p>
          </div>
          <div class="mt-1 auth-error" v-if="errors.accept">{{ errors.accept }}</div>
        </div>

        <div class="auth-step-actions">
          <q-btn flat no-caps class="auth-back" icon="lucide-arrow-left" :label="t('back')" @click="step = 2" />
          <q-btn
            unelevated
            no-caps
            type="submit"
            color="primary"
            text-color="dark"
            class="auth-submit"
            :label="t('submit')"
            :loading="loading"
          />
        </div>
      </q-form>
    </template>

    <p class="auth-footer">
      {{ t('footer_text') }}
      <router-link class="auth-link" :to="{ name: 'auth.login', query: $route.query }">
        {{ t('footer_link') }}
      </router-link>
    </p>
  </AuthShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import { useForm } from 'alova/client';
import { useRoute, useRouter } from 'vue-router';
import AccountTypePicker from 'src/components/Auth/AccountTypePicker.vue';
import AuthShell from 'src/components/Auth/AuthShell.vue';
import ChoiceChips from 'src/components/Auth/ChoiceChips.vue';
import PasswordInput from 'src/components/Auth/PasswordInput.vue';
import { alova } from 'src/boot/alova';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { authText } from 'src/utils/auth-pages';
import { afterSignIn } from 'src/utils/auth-redirect';
import { AccountTypeValue, ResponseBody, User } from 'src/utils/models';
import { reboot } from 'src/utils/proccessor';

const route = useRoute();
const router = useRouter();
const boot = useBootstrapStore();
const t = (key: string) => authText('register', key);

const step = ref(1);
const steps = computed(() => [t('step_type'), t('step_identity'), t('step_access')]);

const { form, send, error, loading, onSuccess } = useForm(
  (form) =>
    alova.Post<ResponseBody<User>>('auth/register', form, {
      params: { with: 'permissions,roles' },
    }),
  {
    initialForm: {
      account_type: (['creator', 'listener'].includes(String(route.query.type)) ? route.query.type : null) as AccountTypeValue | null,
      identities: <string[]>[],
      email: '',
      phone: '',
      lastname: '',
      firstname: '',
      accept: false,
      password: '',
      password_confirmation: '',
    },
  },
);

const errors = computed<Record<string, string>>(
  () => (error.value as unknown as ResponseBody<string>)?.errors || {},
);

const identityOptions = computed(
  () => boot.accountTypes.find((type) => type.value === form.value.account_type)?.identities ?? [],
);

const identityError = computed(
  () => errors.value.identities || Object.entries(errors.value).find(([key]) => key.startsWith('identities.'))?.[1],
);

const required = (value: string) => !!value?.trim() || 'Required';

/** Identities belong to one account type, so switching types clears them. */
watch(
  () => form.value.account_type,
  () => {
    const allowed = identityOptions.value.map((option) => option.value);

    form.value.identities = form.value.identities.filter((identity) => allowed.includes(identity));
  },
);

/** The step holding each field, so a rejected sign-up opens the step to fix. */
const fieldStep = (field: string) => {
  if (field === 'account_type') {
    return 1;
  }

  return ['name', 'firstname', 'lastname', 'identities'].includes(field.split('.')[0] ?? '') ? 2 : 3;
};

const submit = () =>
  send().catch(() => {
    const first = Object.keys(errors.value)
      .map(fieldStep)
      .sort()[0];

    if (first) {
      step.value = first;
    }
  });

onSuccess(({ data }) => {
  reboot().then(() => {
    if (data.data) {
      useBootstrapStore().saveAuthUser(data.data, data.token);
      router.replace(afterSignIn(data.data, route.query.redirect));
    }
  });
});

useMeta(() => ({ title: t('title') || 'Sign up', titleTemplate: (title) => `${title} - Toneflix Music` }));
</script>

<style lang="scss" scoped>
.auth-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 0 0 28px;
  padding: 0;
  list-style: none;
}

.auth-steps__item {
  min-width: 0;
  padding-top: 10px;
  border-top: 3px solid var(--tf-border);
  transition: border-color 0.2s ease;

  button {
    padding: 0;
    overflow: hidden;
    max-width: 100%;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--tf-text-subtle);
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
    border: 0;
    background: none;
    cursor: pointer;

    &:disabled {
      cursor: default;
    }
  }

  &--on {
    border-color: var(--q-primary);

    button {
      color: var(--tf-text);
    }
  }
}

.auth-step-actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;

  > .auth-back {
    flex: none;
  }

  > .auth-submit {
    flex: 1 1 auto;
  }
}
</style>
