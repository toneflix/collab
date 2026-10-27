<template>
  <q-dialog v-model="show">
    <q-card class="w-full max-w-lg bg-dark">
      <q-form @submit="submit">
        <q-card-section>
          <div class="text-lg font-bold">Claim {{ artist.name }}</div>
          <div class="text-xs text-grey-5">
            Show us you have the right to manage this artist. Once a moderator confirms it, the artist is linked to your account
            and you can edit the profile and manage the catalogue from Studio.
          </div>
        </q-card-section>

        <q-card-section class="flex flex-col gap-3 pt-0">
          <q-select
            dark
            filled
            dense
            emit-value
            map-options
            label="How are you connected to the artist?"
            :options="claimRoles"
            :error="!!errors.role"
            :error-message="errors.role"
            v-model="form.role"
          >
            <template #option="{ itemProps, opt }">
              <q-item v-bind="itemProps">
                <q-item-section>
                  <q-item-label>{{ opt.label }}</q-item-label>
                  <q-item-label caption>{{ opt.hint }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <div class="grid gap-3 sm:grid-cols-2">
            <q-input
              dark
              filled
              dense
              label="Your full or company name"
              :error="!!errors.name"
              :error-message="errors.name"
              :rules="[(v: string) => !!v?.trim() || 'Who is making the claim?']"
              v-model="form.name"
            />
            <q-input
              dark
              filled
              dense
              type="email"
              label="Contact email"
              :error="!!errors.email"
              :error-message="errors.email"
              :rules="[validEmail]"
              v-model="form.email"
            />
          </div>

          <div class="flex flex-col gap-2">
            <div class="text-sm">Links that prove your connection</div>
            <div class="-mt-1 text-xs text-grey-5">
              The artist’s official site or social accounts that mention you, a distributor or label page, or press.
            </div>
            <LinkListInput :errors="errors" v-model="form.links" />
          </div>

          <q-input
            dark
            filled
            dense
            autogrow
            counter
            maxlength="2000"
            label="Tell us how you manage this artist"
            hint="For example, since when, and what you handle for them."
            :error="!!errors.message"
            :error-message="errors.message"
            :rules="[(v: string) => (v || '').trim().length >= 20 || 'Tell us a bit more (at least 20 characters).']"
            v-model="form.message"
          />

          <q-file
            dark
            filled
            dense
            clearable
            :accept="acceptFor(['.pdf', '.jpg', '.jpeg', '.png'])"
            max-file-size="10485760"
            label="Supporting document (optional)"
            hint="A management or label contract, or a distributor statement. PDF, JPG or PNG up to 10 MB. Only moderators see it."
            :error="!!errors.document"
            :error-message="errors.document"
            v-model="form.document"
            @rejected="notify('That file is too big or not a PDF, JPG or PNG.', 'error')"
          >
            <template #prepend><q-icon name="lucide-paperclip" size="xs" /></template>
          </q-file>

          <q-checkbox
            dark
            dense
            color="toneflix"
            class="text-xs text-grey-4"
            label="I confirm I'm authorised to manage this artist, and the details I've given are accurate."
            v-model="confirmed"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn
            unelevated
            rounded
            no-caps
            type="submit"
            color="toneflix"
            label="Send claim"
            :loading="sending"
            :disable="!confirmed || !form.links.some((link) => link.trim())"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { acceptFor } from 'src/utils/presets';
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import LinkListInput from 'src/components/Utilities/LinkListInput.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import type { Artist } from 'src/utils/models';
import { claimArtistRequest, claimRoles, type ArtistClaim, type ArtistClaimForm } from 'src/utils/requests/artists';

const props = defineProps<{ artist: Artist }>();
const emit = defineEmits<{ claimed: [claim: ArtistClaim] }>();

const boot = useBootstrapStore();
const router = useRouter();

const show = ref(false);
const sending = ref(false);
const confirmed = ref(false);
const errors = ref<Record<string, string>>({});
const form = reactive<ArtistClaimForm>({ role: 'manager', name: '', email: '', links: [''], message: '', document: null });

const validEmail = (value: string) => /.+@.+\..+/.test(value || '') || 'We need an email to reach you.';

const open = () => {
  if (!boot.user?.id) {
    router.push({ name: 'auth.login', query: { redirect: router.currentRoute.value.fullPath } });

    return;
  }

  const previous = props.artist.yourClaim;

  form.role = previous?.role || form.role;
  form.name ||= previous?.name || boot.user.fullname || boot.user.name || '';
  form.email ||= previous?.email || boot.user.email || '';
  form.links = previous?.links?.length ? [...previous.links] : form.links;
  form.message ||= previous?.message || '';
  errors.value = {};
  show.value = true;
};

const submit = async () => {
  sending.value = true;
  errors.value = {};

  try {
    const { data, message } = await claimArtistRequest(props.artist.username || props.artist.id, form).send();

    notify(message, 'success');
    emit('claimed', data);
    show.value = false;
  } catch (error) {
    const body = error as { message?: string; errors?: Record<string, string> };
    errors.value = body.errors || {};
    notify(body.message || 'We could not send your claim.', 'error');
  } finally {
    sending.value = false;
  }
};

defineExpose({ open });
</script>
