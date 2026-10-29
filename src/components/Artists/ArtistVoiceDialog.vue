<template>
  <q-dialog v-model="show" @before-show="load" @hide="stopAll">
    <q-card class="w-full max-w-lg bg-dark">
      <q-card-section class="flex items-center justify-between flex-nowrap">
        <div class="text-lg font-bold">Voice</div>
        <IconBtn icon="lucide-x" class="flex-none!" v-close-popup />
      </q-card-section>

      <q-card-section class="pt-0" v-if="!voice">
        <q-skeleton dark type="rect" height="160px" class="rounded-lg" />
      </q-card-section>

      <template v-else>
        <q-card-section class="pt-0">
          <q-input
            dark
            filled
            dense
            counter
            maxlength="300"
            label="How the artist sings"
            placeholder="Warm alto, light rasp, laid-back delivery"
            v-model="description"
          >
            <template #append v-if="description.trim() !== (voice.description || '')">
              <q-btn flat dense no-caps color="toneflix" label="Save" :loading="saving" @click="saveDescription" />
            </template>
          </q-input>
        </q-card-section>

        <q-card-section class="pt-0">
          <div class="voice-box">
            <div class="voice-box__busy" v-if="voice.status === 'generating'">
              <q-spinner size="18px" color="toneflix" class="flex-none!" />
              <span>Making a voice sample</span>
            </div>

            <template v-else-if="recorder.recording.value && target === 'sample'">
              <RecordingMeter :elapsed="recorder.elapsed.value" :levels="recorder.levels.value" :max="voice.maxSeconds" :min="voice.minSeconds" />
              <q-btn
                unelevated
                rounded
                no-caps
                color="negative"
                icon="lucide-square:fill"
                label="Stop"
                class="mt-3"
                @click="finishSample"
              />
            </template>

            <template v-else-if="voice.sampleUrl">
              <audio controls preload="metadata" class="w-full" :src="voice.sampleUrl" />
              <div class="flex items-center justify-between no-wrap mt-1">
                <span class="text-xs text-grey-6">
                  {{ Math.round(voice.seconds || 0) }}s · {{ voice.source === 'generated' ? 'Made with AI' : 'Your recording' }}
                </span>
                <q-btn
                  flat
                  dense
                  rounded
                  no-caps
                  size="sm"
                  color="grey-5"
                  icon="lucide-trash-2"
                  label="Remove"
                  class="flex-none!"
                  @click="remove"
                />
              </div>
            </template>

            <div class="text-sm text-grey-5" v-else>
              Sing on your own, with no music, for {{ voice.minSeconds }} to {{ voice.maxSeconds }} seconds.
            </div>

            <div class="flex gap-2 mt-3" v-if="!recorder.recording.value && voice.status !== 'generating'">
              <q-btn
                outline
                rounded
                no-caps
                size="sm"
                icon="lucide-mic"
                class="flex-none!"
                :label="voice.sampleUrl ? 'Record again' : 'Record'"
                :disable="uploading || !recorder.supported"
                @click="recordSample"
              />
              <q-btn
                outline
                rounded
                no-caps
                size="sm"
                icon="lucide-cloud-upload"
                label="Upload"
                class="flex-none!"
                :loading="uploading"
                @click="fileInput?.click()"
              />
              <q-btn
                outline
                rounded
                no-caps
                size="sm"
                color="toneflix"
                icon="lucide-sparkles"
                class="flex-none!"
                :label="`Make with AI · ${voice.sampleCredits} credits`"
                :loading="generating"
                @click="generate"
                v-if="voice.sampleCredits"
              />
              <input ref="fileInput" type="file" class="hidden" accept="audio/*" @change="pickFile" />
            </div>
            <div class="mt-2 text-xs text-negative" v-if="recorder.error.value">{{ recorder.error.value }}</div>
          </div>
        </q-card-section>

        <q-card-section class="pt-0" v-if="voice.check">
          <div class="voice-box">
            <div class="voice-box__busy" v-if="voice.check === 'preparing'">
              <q-spinner size="18px" color="toneflix" class="flex-none!" />
              <span>Getting a phrase for you to record</span>
            </div>
            <div class="voice-box__busy" v-else-if="voice.check === 'building'">
              <q-spinner size="18px" color="toneflix" class="flex-none!" />
              <span>Checking your recording</span>
            </div>
            <template v-else-if="voice.check === 'recording'">
              <div class="text-sm">Record yourself saying this to confirm the voice is yours:</div>
              <div class="voice-box__phrase">{{ voice.phrase }}</div>
              <template v-if="recorder.recording.value && target === 'phrase'">
                <RecordingMeter :elapsed="recorder.elapsed.value" :levels="recorder.levels.value" :max="PHRASE_SECONDS" />
                <q-btn
                  unelevated
                  rounded
                  no-caps
                  color="negative"
                  icon="lucide-square:fill"
                  label="Stop and send"
                  class="mt-3"
                  @click="finishPhrase"
                />
              </template>
              <q-btn
                unelevated
                rounded
                no-caps
                color="toneflix"
                icon="lucide-mic"
                label="Record the phrase"
                class="mt-3"
                :loading="uploading"
                :disable="!recorder.supported || recorder.recording.value"
                @click="recordPhrase"
                v-else
              />
            </template>
            <template v-else-if="voice.check === 'failed'">
              <div class="text-sm text-negative">{{ voice.failure }}</div>
              <q-btn
                outline
                rounded
                no-caps
                size="sm"
                icon="lucide-refresh-cw"
                label="New phrase"
                class="mt-3"
                :loading="restarting"
                @click="restart"
              />
            </template>
            <div class="voice-box__busy" v-else-if="voice.check === 'done'">
              <q-icon name="lucide-badge-check" color="positive" size="18px" class="flex-none!" />
              <span>Voice confirmed</span>
            </div>
          </div>
        </q-card-section>

        <q-card-section class="pt-0 text-xs text-grey-6" v-if="voice.sampleUrl && voice.status === 'ready'">
          <template v-if="voice.studio || voice.composer">AI music can sing in this voice.</template>
          <template v-else-if="voice.check && voice.check !== 'done'">AI music can sing in this voice once it's confirmed.</template>
          <template v-else>AI music can't sing in this voice right now.</template>
        </q-card-section>
        <q-card-section class="pt-0 text-xs text-negative" v-else-if="voice.status === 'failed' && voice.failure">
          {{ voice.failure }}
        </q-card-section>
      </template>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import RecordingMeter from 'src/components/Artists/RecordingMeter.vue';
import { notify } from 'src/utils/helpers';
import type { ResponseBody } from 'src/utils/models';
import { useVoiceRecorder } from 'src/utils/voiceRecorder';
import {
  checkVoiceRequest,
  describeArtistVoiceRequest,
  generateVoiceSampleRequest,
  loadArtistVoiceRequest,
  recordingName,
  removeVoiceSampleRequest,
  restartVoiceCheckRequest,
  uploadVoiceSampleRequest,
  type ArtistVoice,
} from 'src/utils/requests/voices';

/** Longest recording of the check phrase, in seconds */
const PHRASE_SECONDS = 20;

const props = defineProps<{ artistId: string | number }>();

const show = defineModel<boolean>({ default: false });
const voice = ref<ArtistVoice>();
const description = ref('');
const saving = ref(false);
const uploading = ref(false);
const generating = ref(false);
const restarting = ref(false);
const target = ref<'sample' | 'phrase'>('sample');
const fileInput = ref<HTMLInputElement>();
const recorder = useVoiceRecorder({ echoCancellation: false, noiseSuppression: false, autoGainControl: false });

let poll: ReturnType<typeof setTimeout> | undefined;

const busy = computed(() => !!voice.value?.busy);

const errorText = (e: unknown, fallback: string) => {
  const body = e as ResponseBody & { errors?: Record<string, string | string[]> };
  const first = body?.errors ? Object.values(body.errors)[0] : undefined;
  return (Array.isArray(first) ? first[0] : first) || body?.message || fallback;
};

const take = (data: ArtistVoice) => {
  voice.value = data;
  description.value = data.description || '';
};

const load = async () => {
  try {
    take(await loadArtistVoiceRequest(props.artistId).send());
  } catch (e) {
    notify(errorText(e, "The voice couldn't be loaded."), 'error');
  }
};

const refresh = async () => {
  try {
    const data = await loadArtistVoiceRequest(props.artistId).send();
    voice.value = data;
  } catch {
    // Tried again on the next tick.
  }
};

watch(busy, (on) => {
  clearTimeout(poll);
  if (!on) return;

  const tick = () => {
    poll = setTimeout(() => {
      void refresh().then(() => {
        if (busy.value && show.value) tick();
      });
    }, 4000);
  };
  tick();
});

const saveDescription = async () => {
  saving.value = true;
  try {
    const { data, message } = await describeArtistVoiceRequest(props.artistId, description.value.trim()).send();
    take(data);
    notify(message, 'success');
  } catch (e) {
    notify(errorText(e, "The voice couldn't be saved."), 'error');
  } finally {
    saving.value = false;
  }
};

const sendSample = async (blob: Blob, name: string) => {
  uploading.value = true;
  try {
    const { data, message } = await uploadVoiceSampleRequest(props.artistId, blob, name).send();
    voice.value = data;
    notify(message, 'success');
  } catch (e) {
    notify(errorText(e, "The sample couldn't be saved."), 'error');
  } finally {
    uploading.value = false;
  }
};

const pickFile = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';

  if (file) void sendSample(file, file.name);
};

const recordSample = async () => {
  target.value = 'sample';
  await recorder.start();
};

const finishSample = async () => {
  const recording = await recorder.stop();
  if (!recording || !voice.value) return;

  if (recording.duration < voice.value.minSeconds) {
    notify(`Sing for at least ${voice.value.minSeconds} seconds.`, 'error');
    return;
  }

  await sendSample(recording.blob, recordingName(recording.blob, 'voice'));
};

const recordPhrase = async () => {
  target.value = 'phrase';
  await recorder.start();
};

const finishPhrase = async () => {
  const recording = await recorder.stop();
  if (!recording) return;

  uploading.value = true;
  try {
    const { data, message } = await checkVoiceRequest(props.artistId, recording.blob, recordingName(recording.blob, 'phrase')).send();
    voice.value = data;
    notify(message, 'success');
  } catch (e) {
    notify(errorText(e, "The recording couldn't be sent."), 'error');
  } finally {
    uploading.value = false;
  }
};

// Recordings stop on their own at their longest length.
watch(recorder.elapsed, (seconds) => {
  if (!recorder.recording.value || !voice.value) return;
  if (target.value === 'sample' && seconds >= voice.value.maxSeconds) void finishSample();
  if (target.value === 'phrase' && seconds >= PHRASE_SECONDS) void finishPhrase();
});

const generate = async () => {
  generating.value = true;
  try {
    const { data, message } = await generateVoiceSampleRequest(props.artistId).send();
    voice.value = data;
    notify(message, 'success');
  } catch (e) {
    notify(errorText(e, "The voice sample couldn't be started."), 'error');
  } finally {
    generating.value = false;
  }
};

const restart = async () => {
  restarting.value = true;
  try {
    const { data } = await restartVoiceCheckRequest(props.artistId).send();
    voice.value = data;
  } catch (e) {
    notify(errorText(e, "A new phrase couldn't be started."), 'error');
  } finally {
    restarting.value = false;
  }
};

const remove = async () => {
  try {
    const { data, message } = await removeVoiceSampleRequest(props.artistId).send();
    take(data);
    notify(message, 'success');
  } catch (e) {
    notify(errorText(e, "The sample couldn't be removed."), 'error');
  }
};

const stopAll = () => {
  clearTimeout(poll);
  recorder.cancel();
};

onBeforeUnmount(() => clearTimeout(poll));
</script>

<style scoped>
.voice-box {
  border-radius: 0.75rem;
  padding: 0.875rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.voice-box__busy {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.voice-box__phrase {
  margin-top: 0.5rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.06);
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.4;
}
</style>
