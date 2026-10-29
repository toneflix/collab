<template>
  <ResponsiveDialog
    title="Song credits"
    card-class="w-full max-w-md"
    body-class="max-h-[70vh] overflow-y-auto"
    v-model="open"
    @before-show="load"
  >
    <div class="flex flex-col gap-5 pb-4">
      <div class="flex items-center gap-3 flex-nowrap!" v-if="track">
        <q-img no-spinner class="rounded-md bg-surface-3 flex-none!" width="48px" height="48px" :src="track.imageUrl" />
        <div class="min-w-0">
          <div class="font-bold truncate">{{ track.title }}</div>
          <div class="text-sm text-fg-muted truncate">{{ track.artist?.name }}</div>
        </div>
      </div>

      <ListSkeleton :rows="3" v-if="loading" />

      <template v-else-if="credits">
        <section v-for="group in groups" :key="group.title">
          <h3 class="credits__heading">{{ group.title }}</h3>
          <q-list dense>
            <q-item
              class="px-0"
              :clickable="!!person.link"
              :key="`${person.id}-${person.role}`"
              @click="visit(person.link)"
              v-for="person in group.people"
            >
              <q-item-section avatar>
                <q-avatar size="36px" class="bg-surface-3">
                  <q-img no-spinner :src="person.imageUrl" v-if="person.imageUrl" />
                  <q-icon name="lucide-user" size="18px" v-else />
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ person.name }}</q-item-label>
                <q-item-label caption>{{ person.role }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </section>

        <section v-if="details.length">
          <h3 class="credits__heading">Release</h3>
          <dl class="credits__details">
            <template :key="detail.label" v-for="detail in details">
              <dt>{{ detail.label }}</dt>
              <dd>{{ detail.value }}</dd>
            </template>
          </dl>
        </section>
      </template>
    </div>
  </ResponsiveDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';
import ResponsiveDialog from 'src/components/Controllers/ResponsiveDialog.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import { loadTrackCreditsRequest } from 'src/utils/requests/requests';
import type { Track, TrackCredit, TrackCredits } from 'src/utils/models';

const props = defineProps<{ track: Track | null }>();

const open = defineModel<boolean>({ default: false });

const router = useRouter();

const loading = ref(false);
const credits = ref<TrackCredits | null>(null);

const DETAILS = {
  composer: 'Composer',
  publisher: 'Publisher',
  recordLabel: 'Label',
  isrc: 'ISRC',
  releaseDate: 'Released',
  genre: 'Genre',
} as const;

const withLink = (people: TrackCredit[], route: 'artist' | 'user') =>
  people.map((person) => ({
    ...person,
    link: person.username
      ? route === 'artist'
        ? { name: 'artist', params: { artist_id: person.username } }
        : { name: 'user', params: { artist_id: person.username } }
      : undefined,
  }));

const groups = computed(() =>
  [
    { title: 'Artists', people: withLink(credits.value?.artists ?? [], 'artist') },
    { title: 'Made with', people: withLink(credits.value?.collaborators ?? [], 'user') },
  ].filter((group) => group.people.length),
);

const details = computed(() =>
  (Object.keys(DETAILS) as (keyof typeof DETAILS)[])
    .filter((key) => credits.value?.details[key])
    .map((key) => ({ label: DETAILS[key], value: credits.value!.details[key]! })),
);

const visit = (link?: RouteLocationRaw) => {
  if (!link) return;

  open.value = false;
  void router.push(link);
};

const load = async () => {
  if (!props.track) return;

  credits.value = null;
  loading.value = true;
  try {
    credits.value = await loadTrackCreditsRequest(props.track.id).send();
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped lang="scss">
.credits__heading {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--tf-text-subtle);
}

.credits__details {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 16px;
  margin: 0;
  font-size: 14px;

  dt {
    color: var(--tf-text-muted);
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
}
</style>
