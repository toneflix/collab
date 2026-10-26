<template>
  <slot :open="open">
    <IconBtn icon="lucide-flag" :label="`Report this ${label}`" @click="open" />
  </slot>

  <q-dialog v-model="show">
    <q-card class="w-full max-w-md bg-dark">
      <q-form @submit="submit">
        <q-card-section>
          <div class="text-lg font-bold">Report this {{ label }}</div>
          <div class="text-xs text-grey-5">
            Moderators review every report. The {{ label }} stays up until they decide.
          </div>
        </q-card-section>

        <q-card-section class="flex flex-col gap-3 pt-0">
          <q-select
            dark
            filled
            dense
            emit-value
            map-options
            label="What's wrong?"
            :options="reportReasons"
            v-model="form.reason"
          >
            <template #option="{ itemProps, opt }">
              <q-item v-bind="itemProps">
                <q-item-section>
                  <q-item-label>{{ opt.label }}</q-item-label>
                  <q-item-label caption v-if="opt.hint">{{ opt.hint }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <q-input
            dark
            filled
            dense
            autogrow
            counter
            maxlength="2000"
            :label="copyright ? 'Which work is being copied, and how?' : 'Anything else we should know? (optional)'"
            :rules="copyright ? [(v: string) => (v || '').trim().length >= 10 || 'Tell us a bit more.'] : []"
            v-model="form.details"
          />

          <template v-if="copyright">
            <q-input
              dark
              filled
              dense
              type="url"
              label="Link to the original work (optional)"
              v-model="form.claim.original_url"
            />
            <div class="grid gap-3 sm:grid-cols-2">
              <q-input
                dark
                filled
                dense
                label="Rights owner"
                :rules="[(v: string) => !!v || 'Who owns the work?']"
                v-model="form.claim.claimant"
              />
              <q-input
                dark
                filled
                dense
                type="email"
                label="Contact email"
                :rules="[(v: string) => /.+@.+\..+/.test(v || '') || 'We need an email to reach you.']"
                v-model="form.claim.email"
              />
            </div>
            <q-checkbox
              dark
              dense
              color="toneflix"
              class="text-xs text-grey-4"
              v-model="form.claim.statement"
              label="I believe in good faith that this use isn't allowed by the rights owner or the law, and the details I've given are accurate."
            />
          </template>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn
            unelevated
            rounded
            no-caps
            type="submit"
            color="toneflix"
            label="Send report"
            :loading="sending"
            :disable="!form.reason || (copyright && !form.claim.statement)"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import {
  isCopyrightReason,
  reportContentRequest,
  reportReasons,
  type ReportableType,
  type ReportReason,
} from 'src/utils/requests/moderation';

const props = withDefaults(
  defineProps<{
    type: ReportableType;
    id: number | string;
    label?: string;
  }>(),
  { label: 'content' },
);

const emit = defineEmits<{ reported: [] }>();

const boot = useBootstrapStore();
const router = useRouter();

const show = ref(false);
const sending = ref(false);
const form = reactive({
  reason: 'copyright' as ReportReason,
  details: '',
  claim: { original_url: '', claimant: '', email: '', statement: false },
});

const copyright = computed(() => isCopyrightReason(form.reason));

const open = () => {
  if (!boot.user?.id) {
    router.push({ name: 'auth.login', query: { redirect: router.currentRoute.value.fullPath } });

    return;
  }

  form.claim.claimant ||= boot.user.fullname || boot.user.name || '';
  form.claim.email ||= boot.user.email || '';
  show.value = true;
};

const submit = async () => {
  sending.value = true;

  try {
    const { message } = await reportContentRequest({
      type: props.type,
      id: props.id,
      reason: form.reason,
      details: form.details || undefined,
      claim: copyright.value ? form.claim : undefined,
    }).send();

    notify(message, 'success');
    show.value = false;
    form.details = '';
    form.claim.statement = false;
    emit('reported');
  } catch (error) {
    notify((error as Error).message, 'error');
  } finally {
    sending.value = false;
  }
};

defineExpose({ open });
</script>
