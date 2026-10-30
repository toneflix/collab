<template>
  <q-page class="song-page">
    <div class="mx-auto max-w-[1100px]" v-if="song">
      <section class="hero">
        <div class="hero__glow" :style="{ backgroundImage: `url(${song.imageUrl})` }" />
        <img class="hero__art" :src="song.imageUrl" :alt="song.title" />
        <div class="hero__info">
          <div class="text-xs font-semibold tracking-widest uppercase text-grey-5">Composition</div>
          <h1 class="hero__title">{{ song.title }}</h1>
          <router-link
            class="writer"
            :to="{ name: 'creator', params: { artist_id: song.writer.username } }"
            v-if="song.writer"
          >
            <q-avatar size="26px">
              <img :src="song.writer.imageUrl" alt="" />
            </q-avatar>
            <span class="font-semibold">{{ song.writer.name }}</span>
          </router-link>

          <div class="facts">
            <span class="explicit flex-none!" title="Explicit" v-if="song.explicit">E</span>
            <span class="flex-none!">{{ song.lineCount }} {{ song.lineCount === 1 ? 'line' : 'lines' }}</span>
            <span class="flex-none!" v-if="song.bpm">{{ song.bpm }} BPM</span>
            <span class="flex-none!" v-if="song.key">{{ song.key }}</span>
            <span class="flex-none!" v-if="song.mood">{{ song.mood }}</span>
            <span class="flex-none!" v-if="song.language">{{ song.language }}</span>
            <span class="flex items-center gap-1 flex-none!" v-if="song.forksCount">
              <q-icon name="lucide-git-fork" size="13px" />
              {{ song.forksCount }} {{ song.forksCount === 1 ? 'fork' : 'forks' }}
            </span>
          </div>

          <div class="text-xs text-grey-5" v-if="song.forkedFrom || song.project">
            <template v-if="song.forkedFrom">
              Forked from
              <router-link class="text-toneflix" :to="{ name: 'composition', params: { slug: song.forkedFrom.slug } }">
                {{ song.forkedFrom.title }}
              </router-link>
              <template v-if="song.forkedFrom.writer"> by {{ song.forkedFrom.writer }}</template>
            </template>
            <template v-if="song.forkedFrom && song.project"> · </template>
            <template v-if="song.project">
              Made into
              <router-link class="text-toneflix" :to="{ name: 'project', params: { project_id: song.project.slug } }">
                {{ song.project.title }}
              </router-link>
            </template>
          </div>

          <div class="actions">
            <template v-if="!boot.isListener">
              <q-btn
                unelevated
                rounded
                no-caps
                color="toneflix"
                text-color="dark"
                icon="lucide-pencil"
                label="Edit in Composer"
                class="flex-none!"
                :to="{ name: 'studio.composer.song', params: { song_id: song.id } }"
                v-if="song.isOwner"
              />
              <template v-else>
                <q-btn
                  unelevated
                  rounded
                  no-caps
                  color="toneflix"
                  text-color="dark"
                  icon="lucide-git-fork"
                  label="Fork"
                  class="flex-none!"
                  :loading="forking"
                  @click="fork"
                  v-if="song.allowForks"
                />
                <q-btn
                  outline
                  rounded
                  no-caps
                  icon="lucide-library"
                  label="Start a project"
                  class="flex-none!"
                  @click="startProject"
                  v-if="song.allowProjects"
                />
              </template>
            </template>
            <IconBtn class="flex-none!" icon="lucide-share-2" aria-label="Copy the link" @click="share" />
            <ReportDialog type="song" label="composition" :id="song.id" v-if="!song.isOwner" />
          </div>
        </div>
      </section>

      <div class="body">
        <article class="lyrics">
          <template :key="i" v-for="(block, i) in blocks">
            <div class="lyrics__section" v-if="block.section">{{ block.section }}</div>
            <p class="lyrics__stanza" v-if="block.lines.length">
              <template :key="n" v-for="(line, n) in block.lines">{{ line }}<br /></template>
            </p>
          </template>
        </article>

        <aside class="more" v-if="more.length">
          <h2 class="mb-3 text-base font-bold">More from {{ song.writer?.name }}</h2>
          <div class="more__grid">
            <CompositionCard :key="other.id" :song="other" v-for="other in more" />
          </div>
        </aside>
      </div>

      <SongProjectDialog :song="song" v-model="projectDialog" @created="onProjectCreated" v-if="song.allowProjects" />
    </div>

    <OopsAlert text="This composition isn't here. It may be private, or its writer took it down." v-else />
  </q-page>
</template>

<script setup lang="ts">
import { copyToClipboard, useMeta } from 'quasar';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import OopsAlert from 'src/components/Alerts/OopsAlert.vue';
import SongProjectDialog from 'src/components/Composer/SongProjectDialog.vue';
import ReportDialog from 'src/components/Moderation/ReportDialog.vue';
import CompositionCard from 'src/components/Compositions/CompositionCard.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { isSectionLine, notifyError } from 'src/utils/composer';
import { notify } from 'src/utils/helpers';
import {
  forkSongRequest,
  loadPublicSongRequest,
  loadPublicSongsRequest,
  type PublicSong,
  type SongProjectRef,
} from 'src/utils/requests/composer';
import { missing } from 'src/utils/requests/prefetch';

defineOptions({
  async preFetch({ store, currentRoute }) {
    const boot = useBootstrapStore(store);
    const res = await loadPublicSongRequest(String(currentRoute.params.slug)).send().catch(missing);

    boot.pageData.current = { song: res?.data ?? null };
  },
});

const boot = useBootstrapStore();
const router = useRouter();

const song = ref<PublicSong | null>((boot.pageData.current as { song?: PublicSong | null }).song ?? null);
const more = ref<PublicSong[]>([]);
const forking = ref(false);
const projectDialog = ref(false);

/** The lyrics split at [Section] tags, keeping blank lines as stanza breaks */
const blocks = computed(() => {
  const out: { section: string | null; lines: string[] }[] = [];
  let current: { section: string | null; lines: string[] } = { section: null, lines: [] };

  const close = () => {
    if (current.section || current.lines.length) out.push(current);
  };

  for (const raw of (song.value?.body ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (isSectionLine(line)) {
      close();
      current = { section: line.slice(1, -1).trim(), lines: [] };
    } else if (!line) {
      if (current.lines.length) {
        close();
        current = { section: null, lines: [] };
      }
    } else {
      current.lines.push(line);
    }
  }
  close();

  return out;
});

const signedIn = () => {
  if (boot.user?.id) return true;
  void router.push({ name: 'auth.login', query: { redirect: router.currentRoute.value.fullPath } });
  return false;
};

const fork = async () => {
  if (!song.value || !signedIn()) return;
  forking.value = true;
  try {
    const res = await forkSongRequest(song.value.id).send();
    notify(res.message, 'success');
    await router.push({ name: 'studio.composer.song', params: { song_id: res.data.id } });
  } catch (e) {
    notifyError(e, "The composition couldn't be forked.");
  } finally {
    forking.value = false;
  }
};

const startProject = () => {
  if (signedIn()) projectDialog.value = true;
};

const onProjectCreated = (_song: unknown, project: SongProjectRef) => {
  void router.push({ name: 'studio.project.track', params: { project_id: project.slug, track_id: project.trackId } });
};

const share = () => {
  void copyToClipboard(window.location.href).then(() => notify('Link copied.', 'success'));
};

const loadMore = async () => {
  more.value = [];
  if (!song.value?.writer) return;
  try {
    const res = await loadPublicSongsRequest({ user: song.value.writer.username, limit: 7 }).send();
    more.value = res.data.filter((other) => other.id !== song.value?.id).slice(0, 6);
  } catch {
    more.value = [];
  }
};

onMounted(() => void loadMore());

useMeta(() => {
  const title = song.value ? `${song.value.title}${song.value.writer ? ` by ${song.value.writer.name}` : ''}` : 'Composition';
  const description = song.value?.body?.split(/\r?\n/).filter((l) => l.trim() && !isSectionLine(l.trim())).slice(0, 2).join(' / ');

  return {
    title,
    titleTemplate: (t) => `${t} - Toneflix Music`,
    meta: {
      description: { name: 'description', content: description || 'A composition on Toneflix Music.' },
      ogTitle: { property: 'og:title', content: title },
      ogImage: { property: 'og:image', content: song.value?.imageUrl ?? '' },
      twitterImage: { name: 'twitter:image', content: song.value?.imageUrl ?? '' },
    },
  };
});
</script>

<style lang="scss" scoped>
.song-page {
  padding: 24px 32px 120px;

  @media (max-width: 1023px) {
    padding: 16px 16px 120px;
  }
}

.hero {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 24px;
  padding-bottom: 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  &__glow {
    position: absolute;
    inset: -24px -32px 30% -32px;
    background-position: center;
    background-size: cover;
    opacity: 0.35;
    filter: blur(60px);
    pointer-events: none;
  }

  &__art {
    position: relative;
    flex: 0 0 auto;
    width: 240px;
    height: 240px;
    object-fit: cover;
    border-radius: 16px;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);

    @media (max-width: 599px) {
      width: 160px;
      height: 160px;
    }
  }

  &__info {
    position: relative;
    display: flex;
    flex: 1 1 280px;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }

  &__title {
    margin: 0;
    font-size: clamp(28px, 5vw, 52px);
    font-weight: 800;
    line-height: 1.05;
    overflow-wrap: anywhere;
  }
}

.writer {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  width: fit-content;
  color: #fff;
  text-decoration: none;

  &:hover span {
    text-decoration: underline;
  }
}

.facts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  font-size: 13px;
  color: #c9ccd3;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 40px;
  padding-top: 28px;

  @media (max-width: 1023px) {
    grid-template-columns: minmax(0, 1fr);
  }
}

.lyrics {
  font-size: 17px;
  line-height: 1.75;
  color: #e7e9ee;

  &__section {
    margin: 22px 0 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #03bfff;

    &:first-child {
      margin-top: 0;
    }
  }

  &__stanza {
    margin: 0 0 18px;
  }
}

.more__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.explicit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: #121212;
  font-size: 10px;
  font-weight: 700;
  border-radius: 3px;
  background: #b3b3b3;
}
</style>
