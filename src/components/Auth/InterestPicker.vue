<template>
  <div class="interest-picker">
    <section class="interest-picker__group">
      <p class="interest-picker__label">{{ t('genres_label') }}</p>
      <div class="flex flex-wrap gap-2" v-if="loading">
        <q-skeleton type="QChip" width="96px" height="34px" :key="n" v-for="n in 10" />
      </div>
      <ChoiceChips :options="shownGenres" :max="MAX_GENRES" v-model="genres" v-else />
      <div class="interest-picker__foot" v-if="!loading">
        <span>{{ genres.length }} of {{ MAX_GENRES }}</span>
        <button type="button" class="interest-picker__more" @click="allGenres = !allGenres" v-if="genreOptions.length > GENRES_SHOWN">
          {{ allGenres ? t('show_less') : t('show_more') }}
        </button>
      </div>
    </section>

    <section class="interest-picker__group">
      <p class="interest-picker__label">{{ t('topics_label') }}</p>
      <div class="flex flex-wrap gap-2" v-if="loading">
        <q-skeleton type="QChip" width="110px" height="34px" :key="n" v-for="n in 10" />
      </div>
      <ChoiceChips :options="topicOptions" :max="MAX_TOPICS" v-model="topics" v-else>
        <template #after>
          <form class="interest-picker__add" @submit.prevent="addTopic" v-if="adding">
            <input
              ref="addInput"
              maxlength="40"
              class="interest-picker__add-input"
              :placeholder="t('add_topic_placeholder')"
              :disabled="saving"
              v-model="newTopic"
              @keydown.esc="adding = false"
              @blur="!newTopic.trim() && (adding = false)"
            />
            <q-spinner size="14px" v-if="saving" />
          </form>
          <button type="button" class="interest-picker__add" @click="startAdding" v-else>
            <q-icon name="lucide-plus" size="14px" />
            {{ t('add_topic') }}
          </button>
        </template>
      </ChoiceChips>
      <div class="mt-2 text-sm text-negative" v-if="addError">{{ addError }}</div>
      <div class="interest-picker__foot" v-if="!loading">
        <span>{{ topics.length }} of {{ MAX_TOPICS }}</span>
        <button type="button" class="interest-picker__more" :disabled="loadingMore" @click="moreTopics" v-if="hasMoreTopics">
          {{ t('show_more') }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import ChoiceChips from 'src/components/Auth/ChoiceChips.vue';
import { authText } from 'src/utils/auth-pages';
import type { Genre, ResponseBody, Topic } from 'src/utils/models';
import { loadGenresRequest } from 'src/utils/requests/requests';
import { addTopicRequest, loadTopicsRequest } from 'src/utils/requests/interests';

const MAX_GENRES = 20;
const MAX_TOPICS = 30;
const GENRES_SHOWN = 18;
const TOPICS_PAGE = 24;

const props = defineProps<{
  /** Topics already picked, shown even when not on a loaded page */
  pickedTopics?: Pick<Topic, 'id' | 'title'>[];
}>();

const genres = defineModel<number[]>('genres', { default: () => [] });
const topics = defineModel<number[]>('topics', { default: () => [] });

const t = (key: string) => authText('interests', key);

const genreList = ref<Genre[]>([]);
const topicList = ref<Topic[]>([]);
const topicPage = ref(1);
const hasMoreTopics = ref(false);
const loading = ref(true);
const loadingMore = ref(false);
const allGenres = ref(false);
const adding = ref(false);
const saving = ref(false);
const newTopic = ref('');
const addError = ref('');
const addInput = ref<HTMLInputElement>();

const genreOptions = computed(() =>
  genreList.value.map((genre) => ({ value: Number(genre.id), label: genre.title, image: genre.imageUrl })),
);

/** The first genres, plus any picked ones further down, until the list is opened. */
const shownGenres = computed(() =>
  allGenres.value
    ? genreOptions.value
    : genreOptions.value.filter((option, index) => index < GENRES_SHOWN || genres.value.includes(option.value)),
);

const topicOptions = computed(() => {
  const loaded = topicList.value.map((topic) => ({ value: topic.id, label: topic.title }));
  const loadedIds = new Set(loaded.map((option) => option.value));
  const pickedElsewhere = (props.pickedTopics ?? [])
    .filter((topic) => !loadedIds.has(topic.id))
    .map((topic) => ({ value: topic.id, label: topic.title }));

  return [...pickedElsewhere, ...loaded];
});

const loadTopics = async (page: number) => {
  const body = await loadTopicsRequest({ page, limit: TOPICS_PAGE }).send();
  const known = new Set(topicList.value.map((topic) => topic.id));

  topicList.value = [...topicList.value, ...body.data.filter((topic) => !known.has(topic.id))];
  topicPage.value = page;
  hasMoreTopics.value = (body.meta?.currentPage ?? page) < (body.meta?.lastPage ?? page);
};

const moreTopics = async () => {
  loadingMore.value = true;

  try {
    await loadTopics(topicPage.value + 1);
  } finally {
    loadingMore.value = false;
  }
};

const startAdding = async () => {
  adding.value = true;
  addError.value = '';
  await nextTick();
  addInput.value?.focus();
};

const addTopic = async () => {
  const title = newTopic.value.trim();

  if (!title || saving.value) {
    return;
  }

  saving.value = true;
  addError.value = '';

  try {
    const { data } = await addTopicRequest(title).send();

    if (!topicList.value.some((topic) => topic.id === data.id)) {
      topicList.value = [data, ...topicList.value];
    }

    if (!topics.value.includes(data.id) && topics.value.length < MAX_TOPICS) {
      topics.value = [...topics.value, data.id];
    }

    newTopic.value = '';
    adding.value = false;
  } catch (e) {
    const body = e as ResponseBody<string>;

    addError.value = body?.errors?.title || body?.message || '';
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  try {
    const [list] = await Promise.all([loadGenresRequest({ limit: 100 }).send(), loadTopics(1)]);

    genreList.value = list.data;
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.interest-picker {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.interest-picker__label {
  margin: 0 0 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--tf-text-muted);
}

.interest-picker__foot {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  font-size: 0.85rem;
  color: var(--tf-text-subtle);

  > * {
    flex: none;
  }
}

.interest-picker__more {
  padding: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--tf-text-muted);
  border: 0;
  background: none;
  cursor: pointer;

  &:hover {
    color: var(--tf-text);
  }
}

.interest-picker__add {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 14px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--tf-text);
  border: 1px dashed var(--tf-border);
  border-radius: 999px;
  background: transparent;
  cursor: pointer;

  &:hover {
    border-color: color-mix(in srgb, var(--q-primary) 50%, var(--tf-border));
  }
}

.interest-picker__add-input {
  width: 150px;
  padding: 0;
  font: inherit;
  color: var(--tf-text);
  border: 0;
  outline: none;
  background: transparent;
}
</style>
