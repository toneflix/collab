<template>
  <q-page class="items-center row justify-evenly">
    <VaButton preset="secondary" border-color="primary" size="small">
      Your button
    </VaButton>
    <VaBadge text="Paid" color="success" class="mr-2" />
    <h1 class="text-3xl font-bold underline" v-if="data">
      {{ data.app_name }}
    </h1>
    <VaAvatar loading />
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { Configuration } from 'src/utils/models';

const data = computed<Configuration>(() => useBootstrapStore().configuration);
</script>
