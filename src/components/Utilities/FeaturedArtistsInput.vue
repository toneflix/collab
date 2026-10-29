<template>
  <q-select
    multiple
    use-chips
    use-input
    input-debounce="300"
    v-bind="$attrs"
    option-value="id"
    option-label="name"
    placeholder="Search artists"
    :max-values="max"
    :options="options"
    :loading="loading || creating"
    :model-value="model"
    @filter="search"
    @update:model-value="update"
  >
    <template v-slot:option="{ opt, itemProps }">
      <q-item v-bind="itemProps">
        <q-item-section avatar>
          <q-avatar rounded>
            <img :src="opt.imageUrl || avatarFallback" :alt="opt.name" />
          </q-avatar>
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ opt.name }}</q-item-label>
          <q-item-label caption lines="1">@{{ opt.username }}</q-item-label>
        </q-item-section>
      </q-item>
    </template>
    <template v-slot:no-option="{ inputValue }">
      <q-item>
        <q-item-section class="text-grey" v-if="inputValue">
          <q-item-label class="flex items-center justify-around">
            "{{ inputValue }}" not found
            <q-btn
              dense
              no-caps
              icon="lucide-plus"
              color="primary"
              class="flex-none"
              label="Create Now"
              @click="create(inputValue)"
            />
          </q-item-label>
        </q-item-section>
        <q-item-section class="text-grey" v-else>Type a name to search</q-item-section>
      </q-item>
    </template>
  </q-select>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useForm } from 'alova/client';
import { alova } from 'src/boot/alova';
import { avatarFallback } from 'src/utils/imageFallback';
import type { Artist, ArtistCredit, ResponseBody } from 'src/utils/models';
import { createArtistRequest } from 'src/utils/requests/requests';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    /** The track's main artist, left out of the choices */
    exclude?: string | number | null;
    max?: number;
  }>(),
  { exclude: null, max: 5 },
);

const model = defineModel<ArtistCredit[]>({ default: () => [] });

const loading = ref(false);
const options = ref<ArtistCredit[]>([]);

const credit = (artist: Artist | ArtistCredit): ArtistCredit => ({
  id: artist.id,
  name: artist.name,
  username: artist.username,
  imageUrl: artist.imageUrl,
});

const update = (value: ArtistCredit[] | null) => {
  model.value = (value ?? []).map(credit);
};

const search = (val: string, done: (fn: () => void) => void, abort: () => void) => {
  if (!val) {
    done(() => (options.value = []));

    return;
  }

  loading.value = true;
  alova
    .Get<ResponseBody<Artist[]>>('/artists', { params: { search: val, limit: 10 } })
    .send()
    .then(({ data }) =>
      done(() => {
        options.value = (data ?? [])
          .filter((artist) => String(artist.id) !== String(props.exclude ?? ''))
          .map(credit);
      }),
    )
    .catch(abort)
    .finally(() => (loading.value = false));
};

const { form, send, loading: creating } = useForm(createArtistRequest, {
  initialForm: { name: '' } as Artist,
});

const create = (name: string) => {
  form.value.name = name;
  void send().then(({ data }) => {
    if (data && model.value.length < props.max) {
      model.value = [...model.value, credit(data)];
    }
  });
};
</script>
