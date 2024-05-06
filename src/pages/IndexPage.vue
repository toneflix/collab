<template>
  <q-page class="items-center row justify-evenly">
    <VaButton preset="secondary" border-color="primary" size="small">
      Your button
    </VaButton>
    <VaBadge text="Paid" color="success" class="mr-2" />
    <h1 class="text-3xl font-bold underline" v-if="data.settings">
      {{ data.settings.site_name }}
    </h1>
    <VaAvatar loading />
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { api } from 'src/boot/axios';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { Initialize } from 'src/utils/models';

defineOptions({
  async preFetch() {
    const { data: e } = await api.get('api/v1/get/settings');
    useBootstrapStore().settings = e.data as Initialize;
  },
});

const data = computed<Initialize>(
  () => useBootstrapStore().settings as Initialize,
);
</script>
