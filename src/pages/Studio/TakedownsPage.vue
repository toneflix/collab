<template>
  <q-page padding>
    <div class="max-w-2xl mx-auto">
      <h1 class="mb-1 text-2xl font-bold">Takedowns</h1>
      <p class="mb-6 text-sm text-grey-5">
        Content of yours that moderators took down. It's hidden from everyone but you. If you think a takedown is a
        mistake, for example because you own the rights or have a licence, you can appeal it once.
      </p>

      <div class="py-10 text-center" v-if="loading && !takedowns.length">
        <q-spinner size="md" />
      </div>

      <div class="py-12 text-center text-grey-5" v-else-if="!takedowns.length">
        <q-icon name="fas fa-circle-check" size="32px" class="mb-4" color="green-6" />
        <div>Nothing of yours has been taken down.</div>
      </div>

      <div class="flex flex-col gap-3" v-else>
        <q-card flat bordered class="bg-dark" :key="takedown.id" v-for="takedown in takedowns">
          <q-card-section class="flex flex-col gap-3">
            <div class="flex items-start justify-between gap-3 flex-nowrap">
              <ModeratedItemRow hide-status :item="takedown.item" v-if="takedown.item" />
              <div class="text-grey-5" v-else>This content was deleted.</div>
              <q-badge rounded class="!flex-none" :color="statusColor[takedown.status]" :label="statusLabel[takedown.status]" />
            </div>

            <div class="text-sm">
              Taken down {{ timeAgoStamp(takedown.createdAt) }} for <b>{{ reasonLabel(takedown.reason) }}</b>.
              <span class="text-grey-4" v-if="takedown.note">{{ takedown.note }}</span>
            </div>

            <div class="p-3 text-sm rounded-lg bg-grey-10" v-if="takedown.appeal">
              <div class="mb-1 text-xs text-grey-5">Your appeal, {{ timeAgoStamp(takedown.appealedAt || takedown.createdAt) }}</div>
              {{ takedown.appeal }}
            </div>

            <div class="p-3 text-sm rounded-lg bg-grey-10" v-if="takedown.resolvedAt">
              <div class="mb-1 text-xs text-grey-5">
                {{ takedown.status === 'restored' ? 'Restored' : 'Appeal declined' }} {{ timeAgoStamp(takedown.resolvedAt || takedown.createdAt) }}
              </div>
              {{ takedown.resolution || (takedown.status === 'restored' ? 'It is visible again.' : 'It stays down.') }}
            </div>

            <template v-if="takedown.canAppeal">
              <q-input
                dark
                filled
                dense
                autogrow
                counter
                maxlength="3000"
                label="Why should this come back?"
                hint="Tell us who owns the rights, and link to a licence or the original if you can."
                v-model="appeals[takedown.id]"
                v-if="appealing === takedown.id"
              />
              <div class="flex gap-2">
                <q-btn
                  outline
                  rounded
                  no-caps
                  size="sm"
                  color="white"
                  icon="fas fa-scale-balanced"
                  label="Appeal"
                  class="!flex-none"
                  v-if="appealing !== takedown.id"
                  @click="appealing = takedown.id"
                />
                <template v-else>
                  <q-btn
                    unelevated
                    rounded
                    no-caps
                    size="sm"
                    color="toneflix"
                    label="Send appeal"
                    class="!flex-none"
                    :loading="sending"
                    :disable="(appeals[takedown.id] || '').trim().length < 20"
                    @click="appeal(takedown)"
                  />
                  <q-btn flat rounded no-caps size="sm" label="Cancel" class="!flex-none" @click="appealing = null" />
                </template>
              </div>
            </template>
          </q-card-section>
        </q-card>

        <div class="flex justify-center" v-if="meta.lastPage > 1">
          <q-pagination
            dark
            color="toneflix"
            :max="meta.lastPage"
            :model-value="meta.page"
            @update:model-value="load"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useMeta } from 'quasar';
import { onMounted, reactive, ref } from 'vue';
import ModeratedItemRow from 'src/components/Moderation/ModeratedItemRow.vue';
import { notify, timeAgoStamp } from 'src/utils/helpers';
import {
  appealTakedownRequest,
  loadMyTakedownsRequest,
  reasonLabel,
  type Takedown,
} from 'src/utils/requests/moderation';

const statusLabel: Record<Takedown['status'], string> = {
  active: 'Down',
  appealed: 'Appeal under review',
  restored: 'Restored',
};

const statusColor: Record<Takedown['status'], string> = {
  active: 'red-9',
  appealed: 'orange-9',
  restored: 'green-9',
};

const takedowns = ref<Takedown[]>([]);
const meta = ref({ page: 1, lastPage: 1 });
const loading = ref(false);
const sending = ref(false);
const appealing = ref<number | null>(null);
const appeals = reactive<Record<number, string>>({});

const load = async (page = 1) => {
  loading.value = true;

  try {
    const response = await loadMyTakedownsRequest(page).send();
    takedowns.value = response.data;
    meta.value = { page: response.meta?.currentPage ?? 1, lastPage: response.meta?.lastPage ?? 1 };
  } catch (error) {
    notify((error as Error).message, 'error');
  } finally {
    loading.value = false;
  }
};

const appeal = async (takedown: Takedown) => {
  sending.value = true;

  try {
    const { data, message } = await appealTakedownRequest(takedown.id, appeals[takedown.id] || '').send();
    Object.assign(takedown, data);
    appealing.value = null;
    notify(message, 'success');
  } catch (error) {
    notify((error as Error).message, 'error');
  } finally {
    sending.value = false;
  }
};

onMounted(() => load());

useMeta({ title: 'Takedowns - Studio' });
</script>
