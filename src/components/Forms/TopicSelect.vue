<template>
  <q-select
    outlined
    multiple
    use-chips
    use-input
    hide-dropdown-icon
    input-debounce="250"
    color="primary"
    class="custom-q-class no-fill"
    input-class="custom-input-class"
    :max-values="max"
    :options="options"
    :loading="loading"
    v-bind="$attrs"
    :model-value="selected"
    @update:model-value="pick"
    @filter="search"
  >
    <template #option="{ itemProps, opt }">
      <q-item v-bind="itemProps">
        <q-item-section avatar class="min-w-0 pr-2" v-if="opt.create">
          <q-icon name="lucide-plus" size="16px" />
        </q-item-section>
        <q-item-section>{{ opt.label }}</q-item-section>
      </q-item>
    </template>
    <template #no-option>
      <q-item>
        <q-item-section class="text-fg-muted">Type to find or add a topic.</q-item-section>
      </q-item>
    </template>
  </q-select>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { notify } from 'src/utils/helpers';
import type { ResponseBody, Topic } from 'src/utils/models';
import { addTopicRequest, loadTopicsRequest } from 'src/utils/requests/interests';

/** A topic in the list, or the "Add …" row that creates one */
type Option = { label: string; value: number; create?: string };

const props = withDefaults(
  defineProps<{
    /** Topics already chosen, so their names show before any search */
    initial?: Pick<Topic, 'id' | 'title'>[];
    max?: number;
  }>(),
  { initial: () => [], max: 10 },
);

const model = defineModel<number[]>({ default: () => [] });

const names = ref(new Map<number, string>(props.initial.map((topic) => [topic.id, topic.title])));
const options = ref<Option[]>([]);
const loading = ref(false);

const selected = computed<Option[]>(() =>
  model.value.map((id) => ({ value: id, label: names.value.get(id) ?? '' })),
);

/** Search results without the topics already chosen, plus an "Add" row when nothing matches exactly. */
const listFor = (text: string, topics: Topic[]): Option[] => {
  const chosen = new Set(model.value);
  const found = topics
    .filter((topic) => !chosen.has(topic.id))
    .map((topic) => ({ value: topic.id, label: topic.title }));
  const title = text.trim();
  const exact = topics.some((topic) => topic.title.toLowerCase() === title.toLowerCase());

  return title.length >= 2 && !exact
    ? [...found, { value: -1, label: `Add "${title}"`, create: title }]
    : found;
};

const search = (text: string, update: (fn: () => void) => void, abort: () => void) => {
  loading.value = true;

  loadTopicsRequest({ search: text, limit: 30 })
    .send()
    .then(({ data }) => {
      data.forEach((topic) => names.value.set(topic.id, topic.title));
      update(() => {
        options.value = listFor(text, data);
      });
    })
    .catch(abort)
    .finally(() => {
      loading.value = false;
    });
};

const create = async (title: string) => {
  try {
    const { data } = await addTopicRequest(title).send();

    names.value.set(data.id, data.title);

    if (!model.value.includes(data.id)) {
      model.value = [...model.value, data.id];
    }
  } catch (e) {
    const body = e as ResponseBody<string>;

    notify(body?.errors?.title || body?.message || 'That topic could not be added.', 'error');
  }
};

const pick = (value: Option[] | null) => {
  const list = value ?? [];
  const adding = list.find((option) => option.create);

  model.value = list
    .filter((option) => !option.create)
    .map((option) => option.value);

  if (adding?.create) {
    void create(adding.create);
  }
};
</script>
