<template>
  <form class="grid gap-4" @submit.prevent="submit">
    <q-banner rounded dense class="text-white bg-orange-10" v-if="settings && !settings.available">
      AI writing is off or not set up, so prompts fail at planning until it is.
    </q-banner>

    <q-input
      dark
      filled
      autogrow
      label="Instructions"
      hint="Say what to make (artists, albums, tracks, genres, moods, compositions) or what to fix: name projects by title or #ID, or ask it to find and fix all missing artwork or unsynced lyrics."
      :input-style="{ minHeight: '120px' }"
      :error="!!errors.prompt"
      :error-message="errors.prompt"
      maxlength="4000"
      v-model="form.prompt"
    />

    <q-select
      dark
      filled
      use-input
      v-if="scope === 'admin'"
      emit-value
      map-options
      input-debounce="300"
      label="Account"
      hint="The agent account that owns what the agent makes and pays for it with its AI credits."
      option-value="id"
      option-label="label"
      :options="ownerOptions"
      :loading="ownersLoading"
      :error="!!errors.owner_id"
      :error-message="errors.owner_id"
      clearable
      @filter="findOwners"
      v-model="form.owner_id"
    >
      <template #option="{ itemProps, opt }">
        <q-item v-bind="itemProps">
          <q-item-section avatar>
            <q-avatar size="32px" color="grey-9">
              <img :src="opt.imageUrl" v-if="opt.imageUrl" />
              <q-icon name="lucide-user" v-else />
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ opt.name || opt.username }}</q-item-label>
            <q-item-label caption>@{{ opt.username }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-item-label caption v-if="opt.aiTools">{{ opt.credits }} credits</q-item-label>
            <q-item-label caption class="text-orange-4" v-else>No AI tools</q-item-label>
          </q-item-section>
        </q-item>
      </template>
    </q-select>

    <div class="grid gap-4 sm:grid-cols-3">
      <q-input
        dark
        filled
        type="number"
        label="Most tracks"
        :min="1"
        :max="settings?.maxTracks || 30"
        :error="!!errors.max_tracks"
        :error-message="errors.max_tracks"
        v-model.number="form.max_tracks"
      />
      <q-input
        dark
        filled
        type="number"
        label="Track length"
        suffix="sec"
        :min="10"
        :max="settings?.maxSeconds || 300"
        :error="!!errors.seconds"
        :error-message="errors.seconds"
        v-model.number="form.seconds"
      />
      <q-input
        dark
        filled
        label="Label"
        placeholder="Toneflix"
        :error="!!errors.label"
        :error-message="errors.label"
        maxlength="100"
        v-model="form.label"
      />
    </div>

    <q-toggle
      dark
      color="toneflix"
      label="Publish albums when they're ready (otherwise they stay drafts)"
      v-model="form.publish"
    />

    <q-toggle
      dark
      color="toneflix"
      label="Draw album covers and artist pictures"
      v-if="settings?.artwork"
      v-model="form.artwork"
    />

    <div class="flex items-center gap-3">
      <q-btn
        unelevated
        rounded
        no-caps
        type="submit"
        color="toneflix"
        class="flex-none!"
        icon="lucide-list-plus"
        label="Queue prompt"
        :loading="saving"
      />
      <span class="text-sm text-grey-5">Prompts run one at a time, oldest first.</span>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { notify } from 'src/utils/helpers';
import { notifyError } from 'src/utils/composer';
import {
  loadAgentOwnersRequest,
  queueAgentRunRequest,
  type AgentOwner,
  type AgentRun,
  type AgentRunForm,
  type AgentScope,
  type AgentSettings,
} from 'src/utils/requests/agent';

const props = defineProps<{ scope: AgentScope; settings?: AgentSettings | null }>();
const emit = defineEmits<{ queued: [run: AgentRun] }>();

const blank = (): AgentRunForm => ({
  prompt: '',
  owner_id: null,
  publish: false,
  artwork: true,
  max_tracks: 12,
  seconds: props.settings?.defaultSeconds || 120,
  label: '',
});

const form = reactive<AgentRunForm>(blank());
const errors = ref<Record<string, string>>({});
const saving = ref(false);
const ownerOptions = ref<(AgentOwner & { label: string })[]>([]);
const ownersLoading = ref(false);

watch(
  () => props.settings?.defaultSeconds,
  (seconds) => {
    if (seconds && !form.prompt) form.seconds = seconds;
  },
);

const findOwners = (search: string, update: (fn: () => void) => void) => {
  ownersLoading.value = true;
  loadAgentOwnersRequest({ search, limit: 10 })
    .send()
    .then((body) =>
      update(() => {
        ownerOptions.value = body.data.map((owner) => ({ ...owner, label: `${owner.name || owner.username} (@${owner.username})` }));
      }),
    )
    .catch(() => update(() => (ownerOptions.value = [])))
    .finally(() => (ownersLoading.value = false));
};

const submit = async () => {
  saving.value = true;
  errors.value = {};

  try {
    const body = await queueAgentRunRequest(props.scope, form).send();
    notify(body.message, 'success');
    Object.assign(form, blank());
    emit('queued', body.data);
  } catch (e) {
    const fields = (e as { errors?: Record<string, string | string[]> })?.errors || {};
    errors.value = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
    notifyError(e, 'The prompt couldn\'t be queued.');
  } finally {
    saving.value = false;
  }
};
</script>
