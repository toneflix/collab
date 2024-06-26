<template>
  <q-page padding>
    <div class="max-w-full mx-auto md:max-w-2xl lg:max-w-3xl">
      <q-tabs
        dense
        no-caps
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="left"
        v-model="tab"
      >
        <q-tab name="basic" label="Basic Info" />
        <q-tab name="meta" label="Meta Data" />
        <q-tab name="tracks" label="Tracks" :disable="!form.title" />
        <q-tab
          name="publish"
          label="Publish"
          v-if="
            !!form.title &&
            !!form.artist_id &&
            tracks.length >= 1 &&
            !!form.draft
          "
        />
      </q-tabs>

      <q-separator />
      <q-linear-progress
        color="primary"
        track-color="grey"
        :value="uploading.total / uploading.loaded"
        v-if="uploading.loaded && uploading.loaded <= 1"
      />

      <q-form @submit="save">
        <q-tab-panels v-model="tab" animated>
          <q-tab-panel name="basic">
            <ReleaseBasicInfoForm
              v-model:form="form"
              :errors="errors"
              :meta="{
                title: form.title,
                username: form.artist?.username,
                imageUrl: form.imageUrl,
              }"
            />
          </q-tab-panel>
          <q-tab-panel name="meta">
            <ReleaseMetaDataForm v-model:form="form" :errors="errors" />
          </q-tab-panel>
          <q-tab-panel name="tracks">
            <div class="grid gap-y-6 md:grid-cols-2 md:gap-x-6">
              <div class="col-span-2">
                <label class="block mb-2 text-xl text-gray-400">
                  Upload Tracks
                </label>
                <q-file
                  outlined
                  multiple
                  bottom-slots
                  ref="uploader"
                  color="primary"
                  class="custom-q-class no-fill"
                  label="Select Files"
                  input-class="custom-input-class"
                  max-files="1"
                  :accept="allowedAudioExts.join(', ')"
                  v-model="file"
                  @update:model-value="processUpload"
                >
                  <template v-slot:prepend>
                    <q-icon name="cloud_upload" @click.stop.prevent />
                  </template>
                  <template v-slot:append>
                    <q-btn
                      outline
                      color="primary"
                      icon-right="chevron_right"
                      label="Retry"
                      :loading="loading"
                      @click="processUpload()"
                      v-if="tError"
                    />
                  </template>
                </q-file>
              </div>

              <div class="col-span-2">
                <q-list bordered separator class="rounded-borders">
                  <q-expansion-item
                    expand-separator
                    :class="{ 'rounded ring-1 ring-red-600': track.hasError }"
                    :model-value="track.hasError"
                    :key="track.id + String(i)"
                    v-for="(track, i) in tracks"
                  >
                    <template v-slot:header>
                      <q-item-section avatar>
                        <q-avatar
                          icon="fas fa-compact-disc"
                          color="white"
                          text-color="dark"
                          class="bg-white !bg-contain !bg-no-repeat !bg-center"
                          :style="{
                            backgroundImage: `linear-gradient(#da000066, #f6f6f6d9), url(${track.imageUrl}) !important`,
                          }"
                        />
                      </q-item-section>

                      <q-item-section> {{ track.title }} </q-item-section>

                      <q-item-section side v-if="$route.params.release_id">
                        <div class="items-center row">
                          <ContentRemover
                            flat
                            dense
                            round
                            size="md"
                            icon="clear"
                            color="red"
                            :base-url="`creator/releases/${$route.params.release_id}/tracks`"
                            :id="track.id"
                            :list="(() => tracks as unknown as GenericData[])()"
                            @click.stop.prevent
                          />
                        </div>
                      </q-item-section>
                    </template>
                    <q-card>
                      <q-card-section>
                        <ReleaseBasicInfoForm
                          hide-privacy-options
                          type="track"
                          v-model:form="tracks[i]"
                          :index="i + 1"
                          :errors="errors"
                          :meta="{
                            title: track.title,
                            username: track.artist?.username,
                            imageUrl: track.imageUrl,
                          }"
                          @error="track.hasError = true"
                          @error-cleared="delete track.hasError"
                        />
                      </q-card-section>
                    </q-card>
                  </q-expansion-item>
                </q-list>
              </div>
            </div>
          </q-tab-panel>

          <q-tab-panel name="publish">
            <q-banner
              rounded
              class="p-2 m-3 text-center text-green-800 border border-green-800 border-solid bg-green-50 rounded-xl"
            >
              <span class="text-lg">
                Once your release is published, it will become available to
                everyone, by publishing this release you acknowledge that you
                have read and accepted our
                <router-link
                  :to="{
                    name: 'home',
                  }"
                >
                  <span class="text-info">Terms of Service</span>
                </router-link>
                and our
                <router-link
                  :to="{
                    name: 'home',
                  }"
                >
                  <span class="text-info">Privacy Policy.</span>
                </router-link>
              </span>

              <template v-slot:action>
                <div class="flex justify-center w-full">
                  <q-btn
                    label="Publish Now"
                    class="font-semibold !flex-none rounded-xl"
                    icon="fas fa-check-circle"
                    :loading="saving"
                    @click="
                      () => {
                        form.draft = 0;
                        form.publish = 1;
                        save();
                      }
                    "
                  />
                </div>
              </template>
            </q-banner>
          </q-tab-panel>
        </q-tab-panels>

        <div
          class="justify-end gap-2 mt-4 text-center md:flex md:items-center md:col-span-2"
          v-if="tab !== 'publish'"
        >
          <q-btn
            no-caps
            outline
            type="submit"
            color="primary"
            class="mb-5 text-xl rounded-lg md:!mb-0"
            label="Cancel"
          />
          <q-btn
            no-caps
            type="submit"
            color="primary"
            class="mb-5 text-xl rounded-lg md:!mb-0"
            label="Save"
            :loading="saving"
          />
        </div>
      </q-form>
      <q-inner-loading
        class="bg-gray-800/70"
        :showing="!!form.publish && saving"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import ContentRemover from 'src/components/Utilities/ContentRemover.vue';
import ReleaseBasicInfoForm from 'src/components/Forms/ReleaseBasicInfoForm.vue';
import ReleaseMetaDataForm from 'src/components/Forms/ReleaseMetaDataForm.vue';
import {
  GenericData,
  Release,
  ResponseBody,
  Track,
  UploadData,
} from 'src/utils/models';
import { computed, ref } from 'vue';
import { genres } from 'src/utils/dummy';
import { useForm } from '@alova/scene-vue';
import {
  createReleaseRequest,
  loadReleaseRequest,
  saveTrackRequest,
} from 'src/utils/requests';
import { trackErrorStep } from 'src/utils/navigations';
import { useRoute, useRouter } from 'vue-router';
import { useWatcher } from 'alova';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import { allowedAudioExts } from 'src/utils/presets';

defineOptions({
  async preFetch({ currentRoute, store }) {
    const boot = useBootstrapStore(store);
    const id = String(currentRoute.params.release_id);
    if (currentRoute.params.release_id) {
      await loadReleaseRequest(id, { with: 'artist,genre,tracks' })
        .send()
        .then((data) => {
          if (data) {
            data.draft = data?.draft ? 1 : 0;
          }
          boot.pageData.current = data as unknown as GenericData;
        });
    }
  },
});

const tab = ref<'basic' | 'meta' | 'tracks' | 'publish'>('basic');
const file = ref<File | File[]>();
const route = useRoute();
const router = useRouter();
const uploader = ref();
const current = useBootstrapStore().pageData.current as unknown as Release;
const tracks = ref<Track[]>((current.tracks || []) as Track[]);
const errors = computed(
  () =>
    ((tError.value || error.value) as unknown as ResponseBody<string>)
      ?.errors || {},
);

const { onSuccess: releaseLoaded } = useWatcher(
  () =>
    loadReleaseRequest(route.params.release_id as string, {
      with: 'artist,genre,tracks',
    }),
  [() => route.params.release_id],
  {
    sendable: () => !!route.params.release_id,
    immediate: true,
    initialData: current || {},
  },
);

releaseLoaded(({ data }) => {
  if (!data) {
    return;
  }
  form.value = Object.assign({}, form.value, data, {
    draft: data.draft ? 1 : 0,
    explicit: data.explicit ? 1 : 0,
    contains_music: data.contains_music ? 1 : 0,
  });
  if (data.tracks) {
    tracks.value = data.tracks;
  }
});

const {
  form,
  send: save,
  error,
  loading: saving,
  onError,
  onSuccess,
} = useForm(createReleaseRequest, {
  store: false,
  initialForm: {
    ...current,
    slug: '',
    draft: 1,
    pline: '',
    privacy: 'public',
    explicit: 0,
    genre_id: genres[0].id,
    contains_music: 1,
  } as unknown as Release & UploadData,
});

onError(({ error }) => {
  Object.keys(error.errors).map((e) => {
    const i = e.split('tracks.')?.[1];
    if (i) {
      tracks.value[parseInt(i)].hasError = true;
    }
  });
});

onSuccess(({ data }) => {
  form.value.draft = data.data?.draft ? 1 : 0;
  form.value.publish = 0;
  tab.value = 'basic';
  notify(data.message, data.status);
});

const {
  reset,
  send: saveTrack,
  form: trackForm,
  error: tError,
  onError: onTrackError,
  loading,
  uploading,
} = useForm(saveTrackRequest, {
  initialForm: {
    slug: String(Math.floor(Math.random() * 99999999)),
    privacy: 'public',
    explicit: 0,
    genre_id: genres[0].id,
    release: form.value,
    audio: File,
  } as unknown as Track & UploadData,
});

onTrackError(({ error }: { error: ResponseBody<string[]> }) => {
  tab.value = trackErrorStep(error.errors as GenericData);
});

const processUpload = (files?: File[]) => {
  if (!files && trackForm.value.audio) {
    files = [trackForm.value.audio];
  }

  if (files?.length) {
    trackForm.value.slug =
      tracks.value.length < 1 ? form.value.slug : files[0].name.slug('-');
    trackForm.value.title =
      tracks.value.length < 1 ? form.value.title : files[0].name;
    trackForm.value.title = files[0].name;
    trackForm.value.audio = files[0];
    trackForm.value.genre_id = form.value.genre_id;
    trackForm.value.artist_id = form.value.artist_id;
    trackForm.value.release = form.value;
    trackForm.value.release_id = form.value.id;
    saveTrack().then(({ data }) => {
      if (data) {
        reset();
        uploader.value.removeAtIndex();
        data.explicit = data.explicit ? 1 : 0;
        data.contains_music = data.contains_music ? 1 : 0;
        tracks.value.push(data);
        router.push({
          name: 'studio.release.create',
          params: { release_id: data.release?.id },
        });
      }
    });
  }
};
</script>
