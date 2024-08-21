<template>
  <q-page>
    <q-no-ssr>
      <div
        class="p-4 leading-normal bg-white dark:!bg-gray-500 max-w-full relative"
      >
        <div
          class="flex !flex-none flex-row items-center justify-between gap-3 font-semibold text-gray-900 dark:text-white"
        >
          <q-btn-group
            flat
            outline
            class="!flex-none rounded-2xl border-solid border"
          >
            <q-btn
              flat
              round
              size="sm"
              icon="arrow_back"
              color="white"
              class="border-r border-solid"
              :to="{
                name: 'studio.project',
                params: { project_id: project.id },
              }"
            />
            <q-btn
              flat
              round
              size="sm"
              icon="save"
              color="white"
              class="border-r border-solid"
              :disable="stems.length < 1 || project.released"
              :loading="saving"
              @click="save"
            />
            <q-btn
              flat
              round
              size="sm"
              icon="fas fa-cloud-arrow-up"
              color="white"
              :disable="stems.length < 1 || project.released"
              @click="plBus.emit('startaudiorendering', 'wav')"
              v-if="!conf.previews_on_save"
            />
          </q-btn-group>
          <div class="!flex-none q-gutter-x-xs">
            <q-btn
              dense
              round
              color="white"
              text-color="dark"
              :icon="playing ? ionPause : ionPlay"
              :disable="stems.length < 1"
              @click="togglePlay()"
            />
            <q-btn
              flat
              round
              dense
              icon="fas fa-stop"
              color="red"
              :disable="!playing"
              @click="stop"
            />
            <q-btn
              flat
              dense
              round
              size="sm"
              icon="fas fa-fast-backward"
              :disable="stems.length < 1"
              @click="fast(false)"
            />
            <q-btn
              flat
              dense
              round
              size="sm"
              icon="fas fa-fast-forward"
              :disable="stems.length < 1"
              @click="fast(true)"
            />
          </div>
          <span class="!flex-none">•</span>
          <q-btn-group square dense flat class="!flex-none">
            <q-btn
              flat
              dense
              round
              icon="fas fa-magnifying-glass-minus"
              color="white"
              :disable="zoomIndex >= zoomLevels.length - 1 || stems.length < 1"
              @click="zoom(false)"
            />
            <q-btn
              flat
              dense
              round
              icon="fas fa-magnifying-glass-plus"
              color="white"
              :disable="zoomIndex <= 0 || stems.length < 1"
              @click="zoom(true)"
            />
            <q-btn
              :flat="!autoscroll"
              dense
              icon="fas fa-person-walking-dashed-line-arrow-right"
              :color="autoscroll ? 'primary' : 'white'"
              :disable="stems.length < 1"
              @click="togAutoscroll"
            />
            <q-btn
              flat
              dense
              icon="fas fa-cut"
              color="white"
              :disable="stems.length < 1"
              v-if="state === 'select'"
              @click="plBus?.emit('trim')"
            />
          </q-btn-group>
          <span class="!flex-none">•</span>
          <q-btn-group
            flat
            outline
            class="!flex-none rounded-xl border-solid border"
          >
            <q-btn
              dense
              :flat="st.value != state"
              :color="st.value == state ? 'primary' : 'white'"
              :key="st.value"
              :disable="stems.length < 1"
              :class="{
                'border-l border-solid': i > 0,
              }"
              v-for="(st, i) in playlistStates"
              @click="setState(st.value)"
            >
              <q-icon :name="st.icon" :class="st.class" />
            </q-btn>
          </q-btn-group>
          <q-select
            dense
            outlined
            hide-bottom-space
            color="white"
            label="Fade Type"
            class="custom-q-class no-fill !flex-none fade-selector"
            input-class="custom-input-class"
            dropdown-icon="none"
            v-model="fadeType"
            :options="['logarithmic', 'linear', 'sCurve', 'exponential']"
            @update:model-value="setFadeType"
            v-if="['fadein', 'fadeout'].includes(state)"
          />
        </div>
        <div
          class="flex !flex-none flex-row items-center justify-start gap-3 font-semibold text-gray-900 dark:text-white mt-5 md:!mt-3"
        >
          <q-knob
            reverse
            show-value
            instant-feedback
            class="text-white !flex-none"
            v-model="volume"
            size="md"
            color="grey-10"
            center-color="grey-8"
            track-color="grey-5"
            :thickness="0.4"
            @update:model-value="(v) => plBus?.emit('mastervolumechange', v)"
          >
            <q-icon name="volume_up" />&nbsp;{{ volume }}
          </q-knob>
          <div class="!flex-none q-gutter-x-sm">
            <input
              type="file"
              class="hidden"
              ref="fileInputRef"
              :accept="allowedAudioExts.join(', ')"
              @input="prepStem"
            />
            <q-btn
              dense
              no-caps
              rounded
              icon="fas fa-circle-plus"
              size="sm"
              color="white"
              padding="xs sm"
              text-color="dark"
              :disable="project.released"
              @click="fileInputRef.click()"
            >
              <span class="ml-2 text-base">Upload Stem</span>
            </q-btn>
            <AssetsDialog
              dense
              no-caps
              rounded
              size="sm"
              color="white"
              padding="xs sm"
              text-color="dark"
              :track="track"
              :stems="curr.rawStems"
              :released="project.released"
              @stem-updated="
                (e) => {
                  stemForm = e;
                  noCallbacks = true;
                  uploadStem();
                }
              "
            />
            <ConversationDialog
              dense
              no-caps
              rounded
              size="sm"
              icon="fas fa-comments"
              color="white"
              padding="xs sm"
              text-color="dark"
              type="ProjectTrack"
              :id="track.id"
              :params="{ limit: 30, track_id: track.id }"
            />
            <ProjectTrackInfoDialog
              dense
              no-caps
              rounded
              size="sm"
              color="white"
              padding="xs sm"
              text-color="dark"
              :track="track"
              :project="project"
            />
          </div>
        </div>
        <q-inner-loading :showing="loading || loadingStems">
          &nbsp;
        </q-inner-loading>
      </div>
      <q-banner
        inline-actions
        rounded
        class="p-2 m-3 text-left text-red-800 bg-red-200 border border-red-800 border-solid rounded-xl"
        v-if="useGlobalStore().dawWarning && stems.length >= 1"
      >
        <span class="text-lg">
          <b>This is not a DAW</b>, We've provided this interface to help you
          quickly preview your project stems. But if it ends up being useful for
          more than that, well, who are we to tell you how to use it?
        </span>

        <template v-slot:action>
          <q-btn
            flat
            dense
            label="Dismiss"
            class="font-semibold"
            icon="fas fa-times"
            @click="useGlobalStore().dawWarning = false"
          />
        </template>
      </q-banner>
    </q-no-ssr>
    <div class="flex flex-col max-w-full px-4 mx-auto min-h-64 bg-dark">
      <div
        class="text-right !flex-none"
        v-if="stems.length >= 1 && state === 'select'"
      >
        <q-range
          drag-range
          instant-response
          v-model="timeRange"
          track-size="15px"
          color="primary"
          thumb-color="white"
          thumb-path="M 4 19 h 8 l 0 -27 L 4 -8 Z"
          inner-track-color="grey-8"
          class="!flex-none max-w-[98%] track-ranger"
          :class="{
            'max-w-[calc(100%-100px)]': $q.screen.lt.sm,
            'max-w-[calc(100%-200px)]': $q.screen.gt.xs,
          }"
          :disable="state !== 'select'"
          @update:model-value="
            (e) => {
              state = 'select';
              plBus?.emit(
                'select',
                (e.min / 100) * duration,
                (e.max / 100) * duration,
              );
            }
          "
        />
      </div>
      <div id="playlist" ref="playlistRef" class="!flex-none"></div>
    </div>
    <q-no-ssr>
      <SimpleInfo
        class="m-4"
        text="You have not uploaded any stems yet."
        v-if="stems.length < 1 && !loadingStems && !loading"
      >
        <div class="flex justify-center p-4">
          <q-btn
            dense
            no-caps
            rounded
            icon="fas fa-circle-plus"
            size="sm"
            color="white"
            padding="xs sm"
            class="!flex-none"
            text-color="dark"
            @click="fileInputRef.click()"
          >
            <span class="ml-2 text-base">Upload Stem</span>
          </q-btn>
        </div>
      </SimpleInfo>
    </q-no-ssr>
    <q-inner-loading :showing="loading || loadingStems" />
  </q-page>
</template>

<script setup lang="ts">
import ConversationDialog from 'src/components/Cards/ConversationDialog.vue';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import Playlist from 'waveform-playlist/lib/Playlist';
import AssetsDialog from 'src/components/Cards/AssetsDialog.vue';
import ProjectTrackInfoDialog from 'src/components/Cards/ProjectTrackInfoDialog.vue';
import WaveformPlaylist from 'waveform-playlist';
import { ionPause, ionPlay } from '@quasar/extras/ionicons-v7';
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import 'src/css/playlist.scss';
import { useQuasar } from 'quasar';
import {
  PlaylistState,
  Project,
  ProjectTrack,
  UploadData,
} from 'src/utils/models';
import {
  rebuildPlaylist,
  playlistStates,
  WavePlaylistTrack,
} from 'src/utils/playlist';
import { useGlobalStore } from 'src/stores/global-store';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import {
  deleteProjectTrackStemRequest,
  loadProjectRequest,
  loadProjectTrackRequest,
  loadProjectTrackStemsRequest,
  saveProjectTrackRequest,
  saveProjectTrackStemRequest,
} from 'src/utils/requests/requests';
import { useForm } from '@alova/scene-vue';
import { FadeShape, Track } from 'app/models/wave-playlist.d';
import { allowedAudioExts } from 'src/utils/presets';
import { useWatcher } from 'alova';

defineOptions({
  async preFetch({ currentRoute, store }) {
    const boot = useBootstrapStore(store);
    const pid = String(currentRoute.params.project_id);
    const id = String(currentRoute.params.track_id);
    if (currentRoute.params.project_id) {
      // Load project
      const project = await loadProjectRequest(pid, { with: 'tracks' }).send();

      // Load Tracks
      const track = await loadProjectTrackRequest(project, id, {
        with: 'genre,artist',
      }).send();

      // Build Data
      boot.pageData.current = { track, project };
    }
  },
});

const $q = useQuasar();
const plBus = shallowRef();
const state = ref<PlaylistState>('cursor');
const volume = ref(80);
const loading = ref(true);
const playing = ref(false);
const loopMode = ref(true);
const fadeType = ref<FadeShape>('exponential');
const playlist = shallowRef<Playlist>({} as Playlist);
const duration = ref(0);
const timeRange = ref({ min: 0, max: 100 });
const zoomIndex = ref(4);
const autoscroll = ref(false);
const zoomLevels = [500, 1000, 3000, 5000, 8000];
const playlistRef = ref();
const fileInputRef = ref();

const conf = computed(() => useBootstrapStore().configuration);
const curr = useBootstrapStore().pageData.current as {
  stems: WavePlaylistTrack[];
  track: ProjectTrack;
  project: Project;
  rawStems: (WavePlaylistTrack & UploadData)[];
};

const track = ref(curr.track);
const ready = ref(false);
const project = ref<Project>(curr.project);

const {
  data: stems,
  loading: loadingStems,
  onSuccess: stemsLoaded,
  update,
} = useWatcher(
  () => loadProjectTrackStemsRequest(project.value, track.value),
  [track, project],
  {
    sendable: () => !!track.value?.id,
    initialData: [],
    immediate: true,
  },
);

stemsLoaded(({ data }) => {
  ready.value = true;
  curr.rawStems = data as unknown as (WavePlaylistTrack & UploadData)[];
  update({ data: data.map((e) => e.meta as WavePlaylistTrack) });
});

const prepStem = (e: Event) => {
  stemForm.value.src = (e.target as HTMLInputElement).files?.[0];
  uploadStem();
};

const {
  form: stemForm,
  send: uploadStem,
  reset: resetStemForm,
  onSuccess: stemUploaded,
} = useForm(
  (f: UploadData) => saveProjectTrackStemRequest(f, project.value, track.value),
  {
    initialForm: {
      meta: {},
    } as UploadData,
  },
);

const noCallbacks = ref(false);
stemUploaded(({ data }) => {
  if (!noCallbacks.value) {
    curr.rawStems.push(data.data as unknown as WavePlaylistTrack & UploadData);
    playlist.value.load([data?.data?.meta as unknown as Track]).then(() => {
      stems.value = playlist.value.tracks as unknown as WavePlaylistTrack[];
      loadCallback();
      resetStemForm();
    });
  }
  noCallbacks.value = false;
});

const {
  reset,
  form: trackForm,
  send: saveTrack,
  loading: saving,
  onSuccess: trackSaved,
} = useForm((f) => saveProjectTrackRequest(f, project.value), {
  store: false,
  initialForm: {
    ...track.value,
  } as unknown as ProjectTrack & UploadData,
});

trackSaved(() => {
  reset();
});

const save = () => {
  if (conf.value.previews_on_save) {
    plBus.value.emit('startaudiorendering', 'wav');
  } else {
    rebuildPlaylist(playlist).then((e) => {
      stems.value = e;
      trackForm.value.stems = e.map((stem) => {
        return {
          id: stem.name,
          meta: stem,
        };
      }) as unknown as WavePlaylistTrack[];
      saveTrack();
    });
  }
};

const togglePlay = (start: number = 0, end: number = 0) => {
  plBus.value?.emit(playing.value ? 'pause' : 'play', start, end);
  playing.value = !playing.value;
};

const stop = () => {
  playing.value = false;
  plBus.value?.emit('stop');
};

const fast = (state = false) => {
  playing.value = false;
  plBus.value?.emit(state ? 'fastforward' : 'rewind');
};

const setState = (st: PlaylistState = 'cursor') => {
  state.value = st;
  plBus.value?.emit('statechange', st);
  loopMode.value = st === 'select';
};

const setFadeType = () => {
  plBus.value?.emit('fadetype', fadeType.value);
};

const togAutoscroll = () => {
  autoscroll.value = !autoscroll.value;
  plBus.value?.emit('automaticscroll', autoscroll.value);
};

const zoom = (state = false) => {
  plBus.value?.emit(state ? 'zoomin' : 'zoomout');
  zoomIndex.value = playlist.value.zoomIndex;
};

onMounted(() => {
  const unwatch = watch(ready, () => {
    if (ready.value) {
      playlist.value = WaveformPlaylist({
        samplesPerPixel: 3000,
        mono: false,
        waveHeight: 50,
        container: document.getElementById('playlist'),
        state: 'cursor',
        colors: {
          waveOutlineColor: '#a59f9f',
          timeColor: 'grey',
          fadeColor: 'black',
        },
        controls: {
          show: true,
          width: $q.screen.lt.sm ? 100 : 200,
          widgets: {
            volume: true,
            remove: !project.value.released,
            collapse: true,
            stereoPan: true,
            muteOrSolo: true,
          },
        },
        timescale: true,
        seekStyle: 'line',
        zoomLevels,
      });

      playlist.value.load(stems.value as unknown as Track[]).then(loadCallback);

      plBus.value = playlist.value.getEventEmitter();
      unwatch();
    }
  });
});

const loadCallback = function () {
  if (!plBus.value) {
    return;
  }

  playlist.value.initExporter();
  loading.value = false;
  duration.value = playlist.value.duration;
  zoomIndex.value = playlist.value.zoomIndex;

  plBus.value.emit('automaticscroll', autoscroll.value);

  plBus.value.on('finished', function () {
    playing.value = false;
    loopMode.value &&
      togglePlay(
        (timeRange.value.min / 100) * duration.value,
        (timeRange.value.max / 100) * duration.value,
      );
  });

  plBus.value.on('select', function (start: number, end: number) {
    if (start != end) {
      timeRange.value = {
        min: (start / duration.value) * 100,
        max: (end / duration.value) * 100,
      };
    }
  });

  plBus.value.on('removeTrack', function (tr: WavePlaylistTrack) {
    deleteProjectTrackStemRequest(tr.name, project.value, track.value)
      .send()
      .then(() => {
        stems.value = playlist.value.tracks as unknown as WavePlaylistTrack[];
        curr.rawStems = curr.rawStems.filter((e) =>
          stems.value.some((x) => e.id == x.name),
        );
      });
  });

  plBus.value.on(
    'audiorenderingfinished',
    function (type: string, output: Blob) {
      trackForm.value = track.value as ProjectTrack & UploadData;
      trackForm.value.preview = new File([output], 'preview', {
        type: 'audio/wav',
      });
      if (conf.value.previews_on_save) {
        rebuildPlaylist(playlist).then((e) => {
          stems.value = e;
          trackForm.value.stems = e.map((stem) => {
            return {
              id: stem.name,
              meta: stem,
            };
          }) as unknown as WavePlaylistTrack[];
          // return console.log(trackForm.value.stems);
          saveTrack();
        });
      } else {
        saveTrack();
      }
    },
  );

  // plBus.value?.on('timeupdate', function (pos: number) {
  // timeRange.value.max = (pos / duration.value) * 100;
  // });
};
</script>

<style lang="scss">
.playlist {
  margin-top: 0;
}
.track-ranger {
  .q-slider__track,
  .q-slider__selection,
  .q-slider__focus-ring {
    border-radius: 0;
  }
  .q-slider__track-container--h {
    padding-bottom: 0;
  }
}

.track-ranger .q-slider--focus .q-slider__focus-ring,
body.desktop
  .track-ranger
  .q-slider.q-slider--editable
  .q-slider__track-container:hover
  .q-slider__focus-ring {
  transform: scale3d(1, 1.55, 1);
}

.fade-selector {
  &.q-field--outlined .q-field__control {
    @apply rounded-xl #{!important};
    font-size: 0.6rem !important;
    min-width: 6.5em;
    min-height: 10px;
    .q-field__append {
      display: none;
    }
  }
}
</style>
