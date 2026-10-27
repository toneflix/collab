<template>
  <slot :toggle="toggle" :open="open" />
  <StudioSheet :dock="dock" v-model="open" @show="reload">
    <q-card dark class="history" :class="{ 'history--mobile': $q.screen.lt.sm }">
      <header class="history__head">
        <div>
          <div class="text-lg font-bold">Version history</div>
          <div class="text-xs text-grey-5">Every save and stem change, and who made it</div>
        </div>
        <IconBtn icon="lucide-x" aria-label="Close version history" class="flex-none!" @click="open = false" />
      </header>

      <div class="history__list">
        <template v-for="group in groups" :key="group.label">
          <div class="history__day">{{ group.label }}</div>
          <div
            class="version"
            :class="{ 'version--current': v.id === currentId, 'version--restored': v.action === 'restored' }"
            :key="v.id"
            v-for="v in group.versions"
          >
            <div class="version__rail"><span class="version__dot" /></div>
            <div class="version__body">
              <div class="flex items-start gap-2 no-wrap">
                <q-avatar size="26px" class="flex-none! version__avatar">
                  <img :src="v.user?.imageUrl || avatarFallback" :alt="v.user?.name || ''" v-if="v.user" />
                  <q-icon name="lucide-clock" size="16px" v-else />
                </q-avatar>
                <div class="min-w-0">
                  <div class="text-sm version__text">
                    <template v-if="v.action === 'original'">
                      <b>Start of history</b>
                      <span class="text-grey-5"> · how the track was before changes were recorded</span>
                    </template>
                    <template v-else>
                      <b>{{ isMe(v) ? 'You' : v.user?.name || 'Someone' }}</b>
                      {{ v.action === 'restored' ? restoredText(v) : v.summary }}
                    </template>
                  </div>
                  <div class="text-xs text-grey-5 mt-0.5">
                    {{ clock(v.createdAt) }} · {{ v.stems }} {{ v.stems === 1 ? 'stem' : 'stems' }}
                    <template v-if="v.bpm"> · {{ v.bpm }} BPM</template>
                    <template v-if="v.timeSignature"> · {{ v.timeSignature }}</template>
                  </div>
                  <div class="version__chips" v-if="chips(v).length">
                    <span class="version__chip" :class="`version__chip--${c.kind}`" :key="i" v-for="(c, i) in chips(v)">
                      {{ c.label }}
                    </span>
                  </div>
                </div>
                <q-badge rounded color="toneflix" text-color="dark" class="flex-none! ml-auto" v-if="v.id === currentId">
                  Current
                </q-badge>
                <q-btn
                  flat
                  dense
                  rounded
                  no-caps
                  size="sm"
                  class="flex-none! ml-auto version__restore"
                  icon="lucide-undo-2"
                  :label="$q.screen.gt.xs ? 'Restore' : undefined"
                  :aria-label="`Restore the version from ${fullDate(v.createdAt)}`"
                  :loading="restoring === v.id"
                  :disable="readonly || !!restoring"
                  @click="confirmRestore(v)"
                  v-else
                >
                  <q-tooltip>Put the track back the way it was here</q-tooltip>
                </q-btn>
              </div>
            </div>
          </div>
        </template>

        <div class="p-4 text-sm text-center text-grey-5" v-if="loaded && !versions.length">
          Nothing has changed yet. Saves, new stems and removed stems will show up here.
        </div>

        <div class="p-3 text-center" v-if="page < lastPage">
          <q-btn flat rounded no-caps label="Show older versions" :loading="loading" @click="load(page + 1)" />
        </div>
        <ListSkeleton dense :avatar="false" :rows="5" v-if="loading && !versions.length" />
      </div>
    </q-card>
  </StudioSheet>
</template>

<script setup lang="ts">
import { date, useQuasar } from 'quasar';
import { computed, ref } from 'vue';
import StudioSheet from 'src/components/Studio/StudioSheet.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import { avatarFallback } from 'src/utils/imageFallback';
import {
  loadTrackVersionsRequest,
  restoreTrackVersionRequest,
  type RestoreResult,
  type TrackVersion,
} from 'src/utils/requests/history';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';

const props = defineProps<{
  projectId: string | number;
  trackId: string | number;
  readonly?: boolean;
  /** The editor has changes that aren't saved yet */
  dirty?: boolean;
  /** CSS selector of the column the panel docks into on desktop. */
  dock?: string;
}>();

const emit = defineEmits<{ restored: [result: RestoreResult] }>();

const $q = useQuasar();
const boot = useBootstrapStore();

const open = ref(false);
const versions = ref<TrackVersion[]>([]);
const currentId = ref<number | null>(null);
const page = ref(1);
const lastPage = ref(1);
const loading = ref(false);
const loaded = ref(false);
const restoring = ref<number | null>(null);

const toggle = () => (open.value = !open.value);

const load = async (to = 1) => {
  loading.value = true;
  try {
    const res = await loadTrackVersionsRequest(props.projectId, props.trackId, to).send();
    versions.value = to === 1 ? res.data : [...versions.value, ...res.data.filter((v) => !versions.value.some((o) => o.id === v.id))];
    currentId.value = res.currentId;
    page.value = res.meta.currentPage;
    lastPage.value = res.meta.lastPage;
  } catch (e) {
    notify(errorText(e, 'The history couldn\'t be loaded.'), 'error');
  } finally {
    loading.value = false;
    loaded.value = true;
  }
};

const reload = () => load(1);

/** Refresh the list if it's showing, e.g. after someone else changed the track. */
const refresh = () => {
  if (open.value) void load(1);
};

const errorText = (e: unknown, fallback: string) => (e as { message?: string })?.message || fallback;

const isMe = (v: TrackVersion) => !!v.user && String(v.user.id) === String(boot.user?.id);

const clock = (value: string) => date.formatDate(value, 'h:mm A');
const fullDate = (value: string) =>
  date.formatDate(value, new Date(value).getFullYear() === new Date().getFullYear() ? 'MMM D [at] h:mm A' : 'MMM D, YYYY [at] h:mm A');

const dayLabel = (value: string) => {
  const day = (d: Date) => date.formatDate(d, 'YYYY-MM-DD');
  const d = new Date(value);
  const today = new Date();
  if (day(d) === day(today)) return 'Today';
  if (day(d) === day(date.subtractFromDate(today, { days: 1 }))) return 'Yesterday';
  return date.formatDate(d, d.getFullYear() === today.getFullYear() ? 'dddd, MMM D' : 'MMM D, YYYY');
};

const groups = computed(() => {
  const list: { label: string; versions: TrackVersion[] }[] = [];
  for (const v of versions.value) {
    const label = dayLabel(v.createdAt);
    const last = list[list.length - 1];
    if (last?.label === label) last.versions.push(v);
    else list.push({ label, versions: [v] });
  }
  return list;
});

const restoredText = (v: TrackVersion) =>
  v.restoredFrom ? `restored the version from ${fullDate(v.restoredFrom.createdAt)}` : 'restored an earlier version';

/** Stems added or removed in a version, as small tags. */
const chips = (v: TrackVersion) =>
  v.changes
    .filter((c) => c.type === 'added' || c.type === 'removed')
    .slice(0, 6)
    .map((c) => ({ kind: c.type, label: `${c.type === 'added' ? '+' : '−'} ${'title' in c ? c.title : ''}` }));

const confirmRestore = (v: TrackVersion) => {
  const when = v.action === 'original' ? 'the start of its history' : fullDate(v.createdAt);
  $q.dialog({
    dark: true,
    title: 'Restore this version?',
    message:
      `The track goes back to how it was at ${when}, for everyone working on it. ` +
      'Stems added since are taken off the track, and you can bring them back from here later.' +
      (props.dirty ? '<br><br><b>Your unsaved changes will be lost.</b>' : ''),
    html: true,
    cancel: { label: 'Cancel', flat: true },
    ok: { label: 'Restore', color: 'primary', unelevated: true },
  }).onOk(() => void restore(v));
};

const restore = async (v: TrackVersion) => {
  restoring.value = v.id;
  try {
    const res = await restoreTrackVersionRequest(props.projectId, props.trackId, v.id).send();
    const notes = [
      res.missing.length ? `${res.missing.join(', ')} couldn't be brought back.` : '',
      res.keptAudio.length ? `${res.keptAudio.join(', ')} kept their newer audio.` : '',
    ].filter(Boolean);
    notify(['Version restored.', ...notes].join(' '), 'success');
    emit('restored', res);
    await load(1);
  } catch (e) {
    notify(errorText(e, 'That version couldn\'t be restored.'), 'error');
  } finally {
    restoring.value = null;
  }
};

defineExpose({ toggle, refresh });
</script>

<style lang="scss" scoped>
.history {
  display: flex;
  flex-direction: column;
  width: 400px;
  height: calc(100vh - 32px);
  max-height: none !important;
  margin: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: #15171c;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.55);

  > * {
    flex: 0 0 auto;
  }

  &--mobile {
    width: 100vw;
    height: 100dvh;
    margin: 0;
    border: 0;
    border-radius: 0;
  }

  &__head {
    display: flex;
    flex-wrap: nowrap;
    align-items: flex-start;
    justify-content: space-between;
    padding: 14px 12px 10px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  > .history__list {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    padding-bottom: 12px;
    overflow-y: auto;
  }

  &__day {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 10px 16px 6px;
    color: #8b919c;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: #15171c;
  }
}

.version {
  display: flex;
  flex-wrap: nowrap;
  padding: 0 12px 0 16px;

  &__rail {
    position: relative;
    flex: 0 0 14px;
    margin-right: 10px;

    &::before {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 6px;
      width: 2px;
      background: rgba(255, 255, 255, 0.08);
      content: '';
    }
  }

  &__dot {
    position: absolute;
    top: 16px;
    left: 2px;
    width: 10px;
    height: 10px;
    border: 2px solid #15171c;
    border-radius: 50%;
    background: #5b616c;
  }

  &--current &__dot {
    background: #03bfff;
    box-shadow: 0 0 0 3px rgba(3, 191, 255, 0.25);
  }

  &--restored &__dot {
    background: #f5a623;
  }

  &__body {
    flex: 1 1 auto;
    min-width: 0;
    margin: 4px 0;
    padding: 8px 8px 8px 6px;
    border-radius: 10px;
    transition: background 0.15s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.04);
    }
  }

  &--current &__body {
    background: rgba(3, 191, 255, 0.07);
  }

  &__avatar {
    color: #8b919c;
    background: rgba(255, 255, 255, 0.06);
  }

  &__text {
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
  }

  &__chip {
    flex: 0 0 auto !important;
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 11px;
    line-height: 18px;

    &--added {
      color: #7ee2a8;
      background: rgba(46, 204, 113, 0.12);
    }

    &--removed {
      color: #ff8f8f;
      background: rgba(255, 82, 82, 0.12);
    }
  }

  &__restore {
    opacity: 0.75;

    &:hover {
      opacity: 1;
    }
  }
}
</style>
