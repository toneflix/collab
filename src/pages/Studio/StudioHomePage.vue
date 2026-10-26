<template>
  <q-page padding>
    <div class="max-w-5xl mx-auto py-4">
      <h1 class="text-3xl font-bold font-display">Studio</h1>
      <p class="mt-1 text-fg-muted">Start something new or pick up where you left off.</p>

      <div class="grid grid-cols-1 gap-3 mt-6 sm:grid-cols-2 md:grid-cols-3">
        <RouterLink
          :key="link.title"
          :to="link.to"
          class="studio-tile"
          v-for="link in links"
        >
          <span class="studio-tile__icon">
            <q-icon :name="link.icon" size="22px" />
          </span>
          <span class="min-w-0">
            <span class="block font-semibold">{{ link.title }}</span>
            <span class="block mt-0.5 text-sm text-fg-muted">{{ link.description }}</span>
          </span>
        </RouterLink>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useMeta } from 'quasar';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

const config = computed(() => useBootstrapStore().configuration);

const links = [
  {
    icon: 'lucide-workflow',
    title: 'Start Project',
    description: 'Invite collaborators and build a track together.',
    to: { name: 'studio.projects.create' },
  },
  {
    icon: 'lucide-disc-3',
    title: 'New Release',
    description: 'Publish songs or an album to listeners.',
    to: { name: 'studio.release.create' },
  },
  {
    icon: 'lucide-list-checks',
    title: 'My Projects',
    description: 'Open the projects you own or joined.',
    to: { name: 'studio.projects' },
  },
  {
    icon: 'lucide-radio',
    title: 'My Releases',
    description: 'Manage what you have published.',
    to: { name: 'studio.releases' },
  },
  {
    icon: 'lucide-circle-dollar-sign',
    title: 'Earnings',
    description: 'Sales, tips and withdrawals.',
    to: { name: 'studio.earnings' },
  },
  {
    icon: 'lucide-shield-half',
    title: 'Takedowns',
    description: 'Removed content and your appeals.',
    to: { name: 'studio.takedowns' },
  },
  {
    icon: 'lucide-users',
    title: 'Artists & Collabers',
    description: 'People and artist profiles you work with.',
    to: { name: 'studio.collabers' },
  },
  {
    icon: 'lucide-cog',
    title: 'Studio Settings',
    description: 'Defaults for your studio.',
    to: { name: 'studio.release.create' },
  },
];

useMeta(() => ({
  title: 'Studio',
  titleTemplate: (title) => `${title} - ${config.value.app_name}`,
}));
</script>

<style scoped lang="scss">
.studio-tile {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-lg);
  background: var(--tf-surface-1);
  transition:
    border-color var(--tf-duration) var(--tf-ease),
    background-color var(--tf-duration) var(--tf-ease);

  &:hover {
    border-color: var(--tf-border-strong);
    background: var(--tf-surface-2);
  }

  &:hover .studio-tile__icon {
    color: var(--tf-on-primary);
    background: var(--tf-primary);
  }

  &__icon {
    display: grid;
    flex: none;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: var(--tf-radius-md);
    color: var(--tf-primary);
    background: var(--tf-primary-soft);
    transition:
      color var(--tf-duration) var(--tf-ease),
      background-color var(--tf-duration) var(--tf-ease);
  }
}
</style>
