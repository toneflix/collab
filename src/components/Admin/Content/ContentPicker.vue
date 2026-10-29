<template>
  <q-select
    dark
    filled
    dense
    use-input
    emit-value
    map-options
    input-debounce="300"
    option-value="id"
    option-label="label"
    :options="shown"
    @filter="filter"
    v-model="model"
  >
    <template #option="{ itemProps, opt }">
      <q-item v-bind="itemProps">
        <q-item-section avatar>
          <q-avatar size="28px" :rounded="source !== 'owner'" color="grey-9">
            <img :src="opt.image" v-if="opt.image" />
            <q-icon size="14px" :name="icons[source]" v-else />
          </q-avatar>
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ opt.label }}</q-item-label>
          <q-item-label caption v-if="opt.caption">{{ opt.caption }}</q-item-label>
        </q-item-section>
      </q-item>
    </template>
    <template #no-option>
      <q-item><q-item-section class="text-grey-5">Nothing matches.</q-item-section></q-item>
    </template>
  </q-select>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { loadAdminContentRequest, loadContentOwnersRequest } from 'src/utils/requests/adminContent';

type Option = { id: number; label: string; caption?: string | null; image?: string | null };

const props = defineProps<{
  source: 'owner' | 'artist' | 'release';
  /** The picked item's name, so it shows before anything loads */
  initial?: Option | null;
}>();

const model = defineModel<number | string | null>({ default: null });

const icons = { owner: 'lucide-user', artist: 'lucide-mic-vocal', release: 'lucide-disc-3' };

const options = ref<Option[]>([]);
const picked = ref<Option | null>(props.initial ?? null);

watch(
  () => props.initial,
  (initial) => (picked.value = initial ?? null),
);

watch(model, (id) => {
  picked.value = id ? (options.value.find((option) => option.id === id) ?? picked.value) : null;
});

/** The results, with the picked item kept so its name still shows */
const shown = computed(() =>
  picked.value ? [picked.value, ...options.value.filter((option) => option.id !== picked.value?.id)] : options.value,
);

const search = async (term: string): Promise<Option[]> => {
  if (props.source === 'owner') {
    const { data } = await loadContentOwnersRequest(term).send();

    return data.map((user) => ({ id: user.id, label: user.name || user.username, caption: `@${user.username}`, image: user.imageUrl }));
  }

  const { data } = await loadAdminContentRequest(props.source, { search: term, limit: 20 }).send();

  return data.map((item) => ({ id: item.id, label: item.title, caption: item.subtitle, image: item.image }));
};

const filter = (term: string, update: (fn: () => void) => void) => {
  search(term)
    .then((found) => update(() => (options.value = found)))
    .catch(() => update(() => (options.value = [])));
};
</script>
