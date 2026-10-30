<template>
  <div>
    <SettingsCard
      title="Interests"
      caption="Your genres and topics shape the playlists made for you."
    >
      <BlockSkeleton variant="form" v-if="loading" />

      <q-form class="flex flex-col gap-6" @submit="saveInterests" v-else>
        <div>
          <span class="settings-card__label">How you use Toneflix Music</span>
          <AccountTypePicker v-model="interests.account_type" />
          <p class="mt-2 text-xs text-fg-muted" v-if="boot.isListener">
            Switch to Creator to open the studio, start projects and write songs.
          </p>
        </div>

        <div v-if="identityOptions.length">
          <span class="settings-card__label">
            {{
              interests.account_type === 'creator'
                ? 'What you do'
                : 'What describes you'
            }}
          </span>
          <ChoiceChips
            :options="identityOptions"
            :max="6"
            v-model="interests.identities"
          />
        </div>

        <InterestPicker
          :picked-topics="pickedTopics"
          v-model:genres="interests.genres"
          v-model:topics="interests.topics"
        />
        <div
          class="text-sm text-negative"
          v-if="errors.genres || errors.topics"
        >
          {{ errors.genres || errors.topics }}
        </div>

        <div class="settings-card__actions">
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
    </SettingsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import SettingsCard from 'src/components/Account/SettingsCard.vue';
import AccountTypePicker from 'src/components/Auth/AccountTypePicker.vue';
import ChoiceChips from 'src/components/Auth/ChoiceChips.vue';
import InterestPicker from 'src/components/Auth/InterestPicker.vue';
import BlockSkeleton from 'src/components/Skeletons/BlockSkeleton.vue';
import { useSettingsForm } from 'src/composables/useSettingsForm';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import {
  loadInterestsRequest,
  saveInterestsRequest,
} from 'src/utils/requests/interests';
import type { AccountTypeValue, Interests } from 'src/utils/models';

useMeta({ title: 'Your music' });

const boot = useBootstrapStore();
const { errors, saving, run } = useSettingsForm();

const loading = ref(true);
const pickedTopics = ref<Interests['topics']>([]);
const interests = reactive({
  account_type: <AccountTypeValue | null>null,
  identities: <string[]>[],
  genres: <number[]>[],
  topics: <number[]>[],
});

const identityOptions = computed(
  () =>
    boot.accountTypes.find((type) => type.value === interests.account_type)
      ?.identities ?? [],
);

/** Identities belong to one account type, so switching types drops the rest. */
watch(
  () => interests.account_type,
  () => {
    const allowed = identityOptions.value.map((option) => option.value);

    interests.identities = interests.identities.filter((identity) =>
      allowed.includes(identity),
    );
  },
);

onMounted(async () => {
  try {
    const { data } = await loadInterestsRequest().send();

    pickedTopics.value = data.topics;
    Object.assign(interests, {
      account_type: data.accountType,
      identities: data.identities,
      genres: data.genres.map((genre) => genre.id),
      topics: data.topics.map((topic) => topic.id),
    });
  } finally {
    loading.value = false;
  }
});

const saveInterests = () =>
  run('interests', 'We could not save your interests.', async () => {
    const { data, message } = await saveInterestsRequest({
      ...(interests.account_type
        ? { account_type: interests.account_type }
        : {}),
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
  });
</script>
