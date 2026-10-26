<template>
  <q-page padding>
    <div class="max-w-full mx-auto md:max-w-xl lg:max-w-2xl">
      <div class="q-col-gutter-md row">
        <div class="col-6 col-md-4" :key="i" v-for="(link, i) in links">
          <RouterLink :to="link.to" class="block">
            <IconCard :icon="link.icon" :title="link.title" />
          </RouterLink>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useMeta } from 'quasar';
import IconCard from 'src/components/Cards/IconCard.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

const config = computed(() => useBootstrapStore().configuration);

const links = [
  {
    icon: 'lucide-workflow',
    title: 'Start Project',
    to: { name: 'studio.projects.create' },
  },
  {
    icon: 'lucide-disc-3',
    title: 'New Release',
    to: { name: 'studio.release.create' },
  },
  {
    icon: 'lucide-list-checks',
    title: 'My Projects',
    to: { name: 'studio.projects' },
  },
  {
    icon: 'lucide-radio',
    title: 'My Releases',
    to: { name: 'studio.releases' },
  },
  {
    icon: 'lucide-circle-dollar-sign',
    title: 'Earnings',
    to: { name: 'studio.earnings' },
  },
  {
    icon: 'lucide-shield-half',
    title: 'Takedowns',
    to: { name: 'studio.takedowns' },
  },
  {
    icon: 'lucide-users',
    title: 'Artists & Collabers',
    to: { name: 'studio.collabers' },
  },
  {
    icon: 'lucide-cog',
    title: 'Studio Settings',
    to: { name: 'studio.release.create' },
  },
];

useMeta(() => ({
  title: 'Studio',
  titleTemplate: (title) => `${title} - ${config.value.app_name}`,
}));
</script>
