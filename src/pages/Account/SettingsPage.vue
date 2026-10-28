<template>
  <q-page padding>
    <div class="settings">
      <div class="mb-8">
        <h1 class="text-2xl font-bold">Account settings</h1>
        <p class="text-fg-muted">
          Your profile, how people reach you, and how you sign in.
        </p>
      </div>

      <!-- Profile -->
      <section class="settings__card" aria-labelledby="profile-heading">
        <div class="settings__head">
          <div>
            <h2 id="profile-heading" class="settings__title">Profile</h2>
            <p class="settings__caption">Shown on your public page.</p>
          </div>
          <q-btn
            flat
            rounded
            no-caps
            color="primary"
            icon-right="lucide-arrow-up-right"
            label="View your page"
            :to="{ name: 'user', params: { artist_id: user.username } }"
            v-if="user.username"
          />
        </div>

        <div class="flex items-center gap-4 mb-6 flex-nowrap">
          <ImageCropper
            class="flex-none!"
            :aspect-ratio="1"
            :buttons="{ cancel: 'Cancel', crop: 'Use photo' }"
            @result="savePhoto"
          >
            <template #default="{ open }">
              <button
                type="button"
                class="settings__avatar"
                aria-label="Change your photo"
                @click="open"
              >
                <q-avatar size="72px">
                  <img :src="user.imageUrl" alt="" />
                </q-avatar>
                <span class="settings__avatar-edit">
                  <q-spinner size="18px" v-if="savingPhoto" />
                  <q-icon name="lucide-camera" size="18px" v-else />
                </span>
              </button>
            </template>
          </ImageCropper>
          <div class="text-sm text-fg-muted">
            A square photo works best. PNG or JPG, up to 1 MB.
          </div>
        </div>

        <q-form
          class="settings__grid"
          @submit="
            save('profile', ['firstname', 'lastname', 'username', 'about'])
          "
        >
          <q-input
            outlined
            label="First name"
            v-model="form.firstname"
            :error="!!errors.firstname"
            :error-message="errors.firstname"
          />
          <q-input
            outlined
            label="Last name"
            v-model="form.lastname"
            :error="!!errors.lastname"
            :error-message="errors.lastname"
          />
          <q-input
            outlined
            prefix="@"
            label="Username"
            class="settings__wide"
            hint="Letters, numbers, dashes and underscores. Your page link uses it."
            v-model="form.username"
            :error="!!errors.username"
            :error-message="errors.username"
          />
          <q-input
            outlined
            autogrow
            type="textarea"
            label="About you"
            class="settings__wide"
            maxlength="1000"
            counter
            v-model="form.about"
            :error="!!errors.about"
            :error-message="errors.about"
          />
          <div class="settings__actions">
            <q-btn
              unelevated
              rounded
              no-caps
              color="primary"
              type="submit"
              label="Save profile"
              :loading="saving === 'profile'"
            />
          </div>
        </q-form>
      </section>

      <!-- Interests -->
      <section class="settings__card" aria-labelledby="interests-heading">
        <div class="settings__head">
          <div>
            <h2 id="interests-heading" class="settings__title">You and your music</h2>
            <p class="settings__caption">Your genres and topics shape the playlists made for you.</p>
          </div>
        </div>

        <q-form class="flex flex-col gap-6" @submit="saveInterests">
          <div>
            <span class="settings__label">How you use Toneflix Music</span>
            <AccountTypePicker v-model="interests.account_type" />
          </div>

          <div v-if="identityOptions.length">
            <span class="settings__label">
              {{ interests.account_type === 'creator' ? 'What you do' : 'What describes you' }}
            </span>
            <ChoiceChips :options="identityOptions" :max="6" v-model="interests.identities" />
          </div>

          <InterestPicker
            :picked-topics="pickedTopics"
            v-model:genres="interests.genres"
            v-model:topics="interests.topics"
          />
          <div class="text-sm text-negative" v-if="errors.genres || errors.topics">
            {{ errors.genres || errors.topics }}
          </div>

          <div class="settings__actions">
            <q-btn
              unelevated
              rounded
              no-caps
              color="primary"
              type="submit"
              label="Save"
              :disable="!interests.genres.length && !interests.topics.length"
              :loading="saving === 'interests'"
            />
          </div>
        </q-form>
      </section>

      <!-- Contact -->
      <section class="settings__card" aria-labelledby="contact-heading">
        <div class="settings__head">
          <div>
            <h2 id="contact-heading" class="settings__title">Contact</h2>
            <p class="settings__caption">
              Only you and the Toneflix team see these.
            </p>
          </div>
        </div>
        <q-form
          class="settings__grid"
          @submit="save('contact', ['email', 'phone'])"
        >
          <q-input
            outlined
            type="email"
            label="Email"
            v-model="form.email"
            :error="!!errors.email"
            :error-message="errors.email"
          />
          <q-input
            outlined
            type="tel"
            label="Phone"
            v-model="form.phone"
            :error="!!errors.phone"
            :error-message="errors.phone"
          />
          <div class="settings__actions">
            <q-btn
              unelevated
              rounded
              no-caps
              color="primary"
              type="submit"
              label="Save contact"
              :loading="saving === 'contact'"
            />
          </div>
        </q-form>
      </section>

      <!-- Location -->
      <section class="settings__card" aria-labelledby="location-heading">
        <div class="settings__head">
          <div>
            <h2 id="location-heading" class="settings__title">Location</h2>
            <p class="settings__caption">
              Your country also decides how earnings are paid out.
            </p>
          </div>
        </div>
        <q-form
          class="settings__grid settings__grid--3"
          @submit="save('location', ['country', 'state', 'city'])"
        >
          <q-input
            outlined
            label="Country"
            v-model="form.country"
            :error="!!errors.country"
            :error-message="errors.country"
          />
          <q-input
            outlined
            label="State or region"
            v-model="form.state"
            :error="!!errors.state"
            :error-message="errors.state"
          />
          <q-input
            outlined
            label="City"
            v-model="form.city"
            :error="!!errors.city"
            :error-message="errors.city"
          />
          <div class="settings__actions">
            <q-btn
              unelevated
              rounded
              no-caps
              color="primary"
              type="submit"
              label="Save location"
              :loading="saving === 'location'"
            />
          </div>
        </q-form>
      </section>

      <!-- Password -->
      <section class="settings__card" aria-labelledby="password-heading">
        <div class="settings__head">
          <div>
            <h2 id="password-heading" class="settings__title">Password</h2>
            <p class="settings__caption">Use at least 8 characters.</p>
          </div>
        </div>
        <q-form class="settings__grid" @submit="savePassword">
          <q-input
            outlined
            type="password"
            label="Current password"
            autocomplete="current-password"
            class="settings__wide"
            v-model="password.password"
            :error="!!errors.password"
            :error-message="errors.password"
          />
          <q-input
            outlined
            type="password"
            label="New password"
            autocomplete="new-password"
            v-model="password.new_password"
            :error="!!errors.new_password"
            :error-message="errors.new_password"
          />
          <q-input
            outlined
            type="password"
            label="Repeat new password"
            autocomplete="new-password"
            v-model="password.new_password_confirmation"
          />
          <div class="settings__actions">
            <q-btn
              unelevated
              rounded
              no-caps
              color="primary"
              type="submit"
              label="Change password"
              :disable="!password.password || !password.new_password"
              :loading="saving === 'password'"
            />
          </div>
        </q-form>
      </section>

      <TwoFactorSettings class="settings__card" />

      <!-- Elsewhere -->
      <section class="settings__card" aria-labelledby="more-heading">
        <h2 id="more-heading" class="settings__title mb-2">More settings</h2>
        <q-list>
          <q-item
            clickable
            :to="link.to"
            :key="link.label"
            v-for="link in links"
          >
            <q-item-section avatar class="min-w-0 pr-3">
              <q-icon :name="link.icon" size="18px" class="text-fg-muted" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ link.label }}</q-item-label>
              <q-item-label caption>{{ link.caption }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="lucide-chevron-right" size="16px" />
            </q-item-section>
          </q-item>
        </q-list>
      </section>

      <!-- Danger zone -->
      <section
        class="settings__card settings__card--danger"
        aria-labelledby="danger-heading"
      >
        <h2 id="danger-heading" class="settings__title mb-4">Danger zone</h2>

        <div class="settings__danger-row">
          <div>
            <div class="font-semibold">Deactivate account</div>
            <p class="settings__caption">
              Signs you out everywhere and hides your profile, music and
              comments. Sign in again any time to bring everything back.
            </p>
          </div>
          <q-btn
            outline
            rounded
            no-caps
            color="negative"
            label="Deactivate"
            @click="openLeave('deactivate')"
          />
        </div>

        <q-separator class="my-4" />

        <div class="settings__danger-row">
          <div>
            <div class="font-semibold">Delete account</div>
            <p class="settings__caption">
              Same as deactivating, but if you don't sign in within
              {{ deletionDays }} days, your account and everything in it is
              erased for good.
            </p>
          </div>
          <q-btn
            unelevated
            rounded
            no-caps
            color="negative"
            label="Delete"
            @click="openLeave('delete')"
          />
        </div>
      </section>
    </div>

    <q-dialog v-model="leave.show" @hide="closeLeave">
      <q-card class="settings__dialog">
        <q-form @submit="submitLeave">
          <q-card-section>
            <div class="text-lg font-bold">
              {{
                leave.mode === 'delete'
                  ? 'Delete your account?'
                  : 'Deactivate your account?'
              }}
            </div>
            <ul class="settings__consequences">
              <li>You'll be signed out on every device.</li>
              <li>
                Your profile, releases, projects and comments are hidden from
                everyone.
              </li>
              <li v-if="leave.mode === 'delete'">
                Unless you sign in within {{ deletionDays }} days, your account
                and everything in it is erased. This can't be undone.
              </li>
              <li v-else>Sign in again whenever you like to bring it back.</li>
            </ul>
          </q-card-section>

          <q-card-section class="pt-0">
            <q-input
              outlined
              autofocus
              type="password"
              label="Your password"
              autocomplete="current-password"
              v-model="leave.password"
              :error="!!errors.password"
              :error-message="errors.password"
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat rounded no-caps label="Cancel" v-close-popup />
            <q-btn
              unelevated
              rounded
              no-caps
              type="submit"
              color="negative"
              :label="
                leave.mode === 'delete' ? 'Delete account' : 'Deactivate account'
              "
              :disable="!leave.password"
              :loading="saving === 'leave'"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import TwoFactorSettings from 'src/components/Account/TwoFactorSettings.vue';
import AccountTypePicker from 'src/components/Auth/AccountTypePicker.vue';
import ChoiceChips from 'src/components/Auth/ChoiceChips.vue';
import InterestPicker from 'src/components/Auth/InterestPicker.vue';
import ImageCropper from 'src/components/Utilities/ImageCropper.vue';
import { notify } from 'src/utils/helpers';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { useRouter } from 'vue-router';
import {
  deactivateAccountRequest,
  deleteAccountRequest,
  updateAccountRequest,
  updateAvatarRequest,
  type AccountFields,
} from 'src/utils/requests/account';
import { loadInterestsRequest, saveInterestsRequest } from 'src/utils/requests/interests';
import type { AccountTypeValue, Interests } from 'src/utils/models';

type Field = keyof AccountFields;
type CropResult = { base64: string; blob: Blob; file: File };

useMeta({ title: 'Account settings' });

const boot = useBootstrapStore();
const router = useRouter();
const user = computed(() => boot.user);
const deletionDays = computed(
  () => Number(boot.configuration.account_deletion_days) || 30,
);

const form = reactive({
  firstname: '',
  lastname: '',
  username: '',
  about: '',
  email: '',
  phone: '',
  country: '',
  state: '',
  city: '',
});
const password = reactive({
  password: '',
  new_password: '',
  new_password_confirmation: '',
});
const interests = reactive({
  account_type: <AccountTypeValue | null>null,
  identities: <string[]>[],
  genres: <number[]>[],
  topics: <number[]>[],
});
const pickedTopics = ref<Interests['topics']>([]);
const errors = ref<Record<string, string>>({});
const saving = ref<string | null>(null);
const savingPhoto = ref(false);

const links = [
  {
    label: 'Notifications',
    caption: 'What reaches you by email and push',
    icon: 'lucide-bell',
    to: { name: 'account.notifications' },
  },
  {
    label: 'Earnings and payouts',
    caption: 'Your payout account and withdrawals',
    icon: 'lucide-circle-dollar-sign',
    to: { name: 'studio.earnings' },
  },
  {
    label: 'Premium',
    caption: 'Your plan and what it includes',
    icon: 'lucide-crown',
    to: { name: 'premium' },
  },
  {
    label: 'Purchases',
    caption: 'Releases, stems and tips you paid for',
    icon: 'lucide-receipt',
    to: { name: 'library.purchases' },
  },
];

/** Fill the form from the signed-in account, which may arrive after the page. */
watch(
  () => boot.user.id,
  () => {
    Object.keys(form).forEach((key) => {
      const value = boot.user[key as keyof typeof boot.user];

      form[key as keyof typeof form] = typeof value === 'string' ? value : '';
    });
  },
  { immediate: true },
);

const identityOptions = computed(
  () => boot.accountTypes.find((type) => type.value === interests.account_type)?.identities ?? [],
);

/** Identities belong to one account type, so switching types drops the rest. */
watch(
  () => interests.account_type,
  () => {
    const allowed = identityOptions.value.map((option) => option.value);

    interests.identities = interests.identities.filter((identity) => allowed.includes(identity));
  },
);

onMounted(async () => {
  const { data } = await loadInterestsRequest().send();

  pickedTopics.value = data.topics;
  Object.assign(interests, {
    account_type: data.accountType,
    identities: data.identities,
    genres: data.genres.map((genre) => genre.id),
    topics: data.topics.map((topic) => topic.id),
  });
});

const fail = (error: unknown, fallback: string) => {
  const body = error as {
    message?: string;
    errors?: Record<string, string | string[]>;
  };

  errors.value = Object.fromEntries(
    Object.entries(body.errors || {}).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  ) as Record<string, string>;
  notify(body.message || fallback, 'error');
};

const save = async (section: string, fields: Field[]) => {
  saving.value = section;
  errors.value = {};

  try {
    const changed = fields.filter(
      (key) =>
        form[key as keyof typeof form] !==
        (boot.user[key as keyof typeof boot.user] ?? ''),
    );

    if (!changed.length) {
      notify('Nothing has changed yet.', 'info');
      return;
    }

    const payload = Object.fromEntries(
      changed.map((key) => [key, form[key as keyof typeof form]]),
    );
    const { data, message } = await updateAccountRequest(
      section,
      payload,
    ).send();

    boot.setUser({ ...boot.user, ...data });
    notify(message, 'success');
  } catch (error) {
    fail(error, 'We could not save your changes.');
  } finally {
    saving.value = null;
  }
};

const saveInterests = async () => {
  saving.value = 'interests';
  errors.value = {};

  try {
    const { data, message } = await saveInterestsRequest({
      ...(interests.account_type ? { account_type: interests.account_type } : {}),
      identities: interests.identities,
      genres: interests.genres,
      topics: interests.topics,
    }).send();

    boot.setUser({
      ...boot.user,
      accountType: data.accountType,
      identities: data.identities,
      interestsAt: data.interestsAt,
    });
    notify(message, 'success');
  } catch (error) {
    fail(error, 'We could not save your interests.');
  } finally {
    saving.value = null;
  }
};

const savePassword = async () => {
  saving.value = 'password';
  errors.value = {};

  try {
    const { message } = await updateAccountRequest('password', {
      ...password,
    }).send();

    Object.assign(password, {
      password: '',
      new_password: '',
      new_password_confirmation: '',
    });
    notify(message, 'success');
  } catch (error) {
    fail(error, 'We could not change your password.');
  } finally {
    saving.value = null;
  }
};

const leave = reactive({
  show: false,
  mode: <'deactivate' | 'delete'>'deactivate',
  password: '',
});

const openLeave = (mode: 'deactivate' | 'delete') => {
  errors.value = {};
  Object.assign(leave, { show: true, mode, password: '' });
};

/** The dialog shares `errors` with the password form, so clear its error on close. */
const closeLeave = () => {
  leave.password = '';
  errors.value = {};
};

/** Deactivate or delete the account, then finish signing out here. */
const submitLeave = async () => {
  saving.value = 'leave';
  errors.value = {};

  try {
    const request =
      leave.mode === 'delete'
        ? deleteAccountRequest(leave.password)
        : deactivateAccountRequest(leave.password);
    const { message } = await request.send();

    leave.show = false;
    notify(message, 'success');
    await router.push({ name: 'auth.logout' });
  } catch (error) {
    fail(error, 'We could not update your account.');
  } finally {
    saving.value = null;
  }
};

const savePhoto = async (result: CropResult) => {
  const type = result.blob.type || 'image/png';
  const file = new File(
    [result.blob],
    `avatar.${type.split('/')[1] || 'png'}`,
    { type },
  );

  savingPhoto.value = true;

  try {
    const { data, message } = await updateAvatarRequest(file).send();

    boot.setUser({ ...boot.user, ...data });
    notify(message, 'success');
  } catch (error) {
    fail(error, 'We could not change your photo.');
  } finally {
    savingPhoto.value = false;
  }
};
</script>

<style lang="scss" scoped>
.settings {
  max-width: 720px;
  margin: 0 auto;

  &__card {
    margin-bottom: 20px;
    padding: 20px;
    border: 1px solid var(--tf-border);
    border-radius: var(--tf-radius-xl);
    background: var(--tf-surface-1);

    &--danger {
      border-color: color-mix(in srgb, var(--tf-danger) 45%, var(--tf-border));
    }
  }

  &__danger-row {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    gap: 16px;

    > * {
      flex: none;
    }

    > :first-child {
      flex: 1 1 auto;
      min-width: 0;
    }

    @media (max-width: 600px) {
      flex-wrap: wrap;
    }
  }

  &__dialog {
    width: 100%;
    max-width: 420px;
  }

  &__consequences {
    margin: 12px 0 0;
    padding-left: 18px;
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--tf-text-muted);
  }

  &__head {
    display: flex;
    flex-wrap: nowrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;

    > * {
      flex: none;
    }

    > :first-child {
      flex: 1 1 auto;
    }
  }

  &__title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    line-height: 1.4;
  }

  &__label {
    display: block;
    margin-bottom: 10px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--tf-text-muted);
  }

  &__caption {
    margin: 2px 0 0;
    font-size: 0.85rem;
    color: var(--tf-text-muted);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px 12px;

    &--3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    @media (max-width: 600px) {
      &,
      &--3 {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  }

  &__wide,
  &__actions {
    grid-column: 1 / -1;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
  }

  &__avatar {
    position: relative;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    cursor: pointer;
  }

  &__avatar-edit {
    position: absolute;
    right: -2px;
    bottom: -2px;
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    color: var(--tf-text);
    border: 2px solid var(--tf-surface-1);
    border-radius: 50%;
    background: var(--tf-surface-3);
  }
}
</style>
