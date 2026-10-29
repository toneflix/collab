<template>
  <ResponsiveDialog
    card-class="w-full max-w-md"
    :title="playlist ? 'Edit playlist' : 'New playlist'"
    v-model="open"
    @before-show="fill"
  >
    <q-form class="flex flex-col gap-3 pb-3" @submit="save">
      <q-input
        dark
        filled
        autofocus
        maxlength="120"
        label="Name"
        :rules="[(v: string) => !!v?.trim() || 'Name your playlist.']"
        v-model="form.title"
      />
      <q-input
        dark
        filled
        autogrow
        counter
        maxlength="1000"
        label="Description (optional)"
        v-model="form.description"
      />
      <q-toggle
        dark
        color="toneflix"
        label="Anyone with the link can see it"
        true-value="public"
        false-value="private"
        v-model="form.privacy"
      />
      <div class="flex justify-end gap-2">
        <q-btn flat no-caps rounded class="flex-none!" label="Cancel" @click="open = false" />
        <q-btn
          unelevated
          no-caps
          rounded
          type="submit"
          color="toneflix"
          class="flex-none!"
          :label="playlist ? 'Save' : 'Create'"
          :loading="saving"
        />
      </div>
    </q-form>
  </ResponsiveDialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import ResponsiveDialog from 'src/components/Controllers/ResponsiveDialog.vue';
import { notify } from 'src/utils/helpers';
import { createPlaylistRequest, updatePlaylistRequest } from 'src/utils/requests/playlists';
import type { Playlist } from 'src/utils/models';

/**
 * Creates a playlist, or edits the one given.
 */
const props = defineProps<{ playlist?: Playlist | null }>();

const emit = defineEmits<{ saved: [playlist: Playlist] }>();

const open = defineModel<boolean>({ default: false });

const saving = ref(false);
const form = reactive({ title: '', description: '', privacy: 'private' as Playlist['privacy'] });

const fill = () => {
  form.title = props.playlist?.title ?? '';
  form.description = props.playlist?.description ?? '';
  form.privacy = props.playlist?.privacy ?? 'private';
};

const save = async () => {
  const fields = { title: form.title.trim(), description: form.description.trim() || null, privacy: form.privacy };

  saving.value = true;
  try {
    const { data, message } = props.playlist
      ? await updatePlaylistRequest(props.playlist.slug, fields).send()
      : await createPlaylistRequest(fields).send();

    emit('saved', data);
    notify(message, 'success');
    open.value = false;
  } finally {
    saving.value = false;
  }
};
</script>
