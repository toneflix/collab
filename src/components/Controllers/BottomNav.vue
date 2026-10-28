<template>
  <nav class="bottom-nav sm:hidden!" aria-label="Main">
    <component
      :is="tab.to ? 'router-link' : 'button'"
      :key="tab.key"
      :to="tab.to"
      type="button"
      class="bottom-nav__tab"
      :class="{ 'bottom-nav__tab--active': tab.key === activeTab }"
      :aria-current="tab.key === activeTab ? 'page' : undefined"
      @click="tab.click?.()"
      v-for="tab in tabs"
    >
      <q-icon size="22px" :name="tab.icon" />
      <span>{{ tab.label }}</span>
    </component>
  </nav>

  <q-no-ssr>
    <AppSheet title="Create" v-model="createOpen">
      <q-list class="-mx-4">
        <q-item
          clickable
          :to="item.to"
          :key="item.title"
          @click="createOpen = false"
          v-for="item in createItems"
        >
          <q-item-section avatar>
            <div class="create-sheet__icon">
              <q-icon size="20px" :name="item.icon" />
            </div>
          </q-item-section>
          <q-item-section>
            <q-item-label class="font-semibold">{{ item.title }}</q-item-label>
            <q-item-label caption>{{ item.caption }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </AppSheet>
  </q-no-ssr>
</template>

<script setup lang="ts">
import AppSheet from 'src/components/Controllers/AppSheet.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { computed, ref } from 'vue';
import { RouteLocationRaw, useRoute, useRouter } from 'vue-router';

type Tab = {
  key: string;
  label: string;
  icon: string;
  to?: RouteLocationRaw;
  click?: () => void;
};

const boot = useBootstrapStore();
const route = useRoute();
const router = useRouter();
const createOpen = ref(false);

/** Pages that belong to each tab, by route name prefix. */
const sections: Record<string, string[]> = {
  home: ['index', 'home'],
  explore: ['explore', 'search', 'genres', 'artists', 'creators', 'albums', 'projects', 'compositions'],
  create: ['studio.'],
  library: ['library.'],
};

const activeTab = computed(() => {
  const name = String(route.name ?? '');
  return Object.keys(sections).find((key) =>
    sections[key]!.some((prefix) => (prefix.endsWith('.') ? name.startsWith(prefix) : name === prefix)),
  );
});

const openCreate = () => {
  if (!boot.user?.id) {
    void router.push({ name: 'auth.login' });
    return;
  }
  createOpen.value = true;
};

const tabs: Tab[] = [
  { key: 'home', label: 'Home', icon: 'lucide-house', to: { name: 'home' } },
  { key: 'explore', label: 'Explore', icon: 'lucide-compass', to: { name: 'explore' } },
  { key: 'create', label: 'Create', icon: 'lucide-circle-plus', click: openCreate },
  { key: 'library', label: 'Library', icon: 'lucide-library', to: { name: 'library.page', params: { type: 'liked' } } },
];

const createItems = computed(() =>
  [
    {
      title: 'New project',
      caption: 'Start a track and invite collaborators',
      icon: 'lucide-plus',
      to: { name: 'studio.projects.create' },
    },
    {
      title: 'Write a song',
      caption: 'Lyrics and chords in the Composer',
      icon: 'lucide-pen-tool',
      to: { name: 'studio.composer' },
    },
    {
      title: 'Content agent',
      caption: 'Describe music and let AI build it',
      icon: 'lucide-bot',
      to: { name: 'studio.agent' },
      hide: !boot.user?.id,
    },
    {
      title: 'My projects',
      caption: 'Everything you are working on',
      icon: 'lucide-speaker',
      to: { name: 'studio.projects' },
    },
    {
      title: 'Studio',
      caption: 'Releases, earnings and collaborators',
      icon: 'lucide-mic',
      to: { name: 'studio.home' },
    },
  ].filter((item) => !item.hide),
);
</script>

<style lang="scss" scoped>
.bottom-nav {
  display: flex;
  flex-wrap: nowrap;
  border-top: 1px solid var(--tf-border);

  &__tab {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 0 6px;
    font-size: 11px;
    font-weight: 500;
    color: var(--tf-text-muted);
    background: none;
    border: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &--active {
      color: var(--tf-text);

      .q-icon {
        color: var(--q-primary);
      }
    }
  }
}

.create-sheet {
  &__icon {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: var(--tf-surface-2);
  }
}
</style>
