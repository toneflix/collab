<template>
  <q-dialog v-model="show" @before-show="reset">
    <q-card class="w-full max-w-sm bg-dark">
      <q-form @submit="remove">
        <q-card-section>
          <div class="text-lg font-bold">Remove “{{ genre?.title }}”</div>
          <div class="text-sm text-grey-5" v-if="inUse">
            {{ usage }} use this genre. Pick where they move to.
          </div>
          <div class="text-sm text-grey-5" v-else>Nothing uses this genre.</div>
        </q-card-section>

        <q-card-section class="pt-0">
          <q-select
            dark
            filled
            dense
            use-input
            emit-value
            map-options
            clearable
            input-debounce="300"
            label="Move music to"
            option-value="id"
            option-label="title"
            :options="options"
            :error="!!error"
            :error-message="error"
            @filter="filter"
            v-model="moveTo"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn
            unelevated
            rounded
            no-caps
            type="submit"
            color="red-9"
            label="Remove genre"
            :loading="busy"
            :disable="inUse && !moveTo"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { notify } from 'src/utils/helpers';
import type { Genre } from 'src/utils/models';
import { deleteGenreRequest, loadAdminGenresRequest } from 'src/utils/requests/adminGenres';

const props = defineProps<{ genre?: Genre | null }>();
const emit = defineEmits<{ removed: [] }>();

const show = defineModel<boolean>({ default: false });
const busy = ref(false);
const error = ref('');
const moveTo = ref<Genre['id'] | null>(null);
const options = ref<Genre[]>([]);

const inUse = computed(() => !!(props.genre?.tracksCount || props.genre?.releasesCount || props.genre?.fansCount));

const usage = computed(() => {
  const parts = [
    [props.genre?.tracksCount, 'track'],
    [props.genre?.releasesCount, 'release'],
    [props.genre?.fansCount, 'listener'],
  ] as const;

  return parts
    .filter(([count]) => count)
    .map(([count, label]) => `${count} ${label}${count === 1 ? '' : 's'}`)
    .join(', ');
});

const reset = () => {
  moveTo.value = null;
  error.value = '';
};

const filter = (search: string, update: (fn: () => void) => void) => {
  loadAdminGenresRequest({ search })
    .send()
    .then(({ data }) => update(() => (options.value = data.filter((genre) => genre.id !== props.genre?.id))))
    .catch(() => update(() => (options.value = [])));
};

const remove = async () => {
  if (!props.genre) return;

  busy.value = true;
  error.value = '';

  try {
    const { message } = await deleteGenreRequest(props.genre.id, moveTo.value).send();

    notify(message, 'success');
    show.value = false;
    emit('removed');
  } catch (e) {
    const body = e as { message?: string; errors?: Record<string, string | string[]> };
    const moveError = body.errors?.move_to;

    error.value = Array.isArray(moveError) ? moveError[0] : moveError || '';
    if (!error.value) notify(body.message || 'The genre could not be removed.', 'error');
  } finally {
    busy.value = false;
  }
};
</script>
