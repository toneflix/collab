<template>
  <q-page padding>
    <div class="max-w-6xl mx-auto">
      <div class="py-8">
        <h1 class="text-3xl font-circlular-std">Content</h1>
        <p class="text-grey-5">Tracks, albums, compositions, projects and artists.</p>
      </div>

      <SettingsSections :sections="sections" v-model="current">
        <template #default="{ section }">
          <ContentList :type="section as ContentKind" :owner-id="ownerId" @clear-owner="clearOwner" />
        </template>
      </SettingsSections>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import SettingsSections, { type SettingsSection } from 'src/components/Admin/SettingsSections.vue';
import ContentList from 'src/components/Admin/Content/ContentList.vue';
import { contentSections } from 'src/utils/admin-content';
import type { ContentKind } from 'src/utils/requests/adminContent';

const route = useRoute();
const router = useRouter();

const current = ref<ContentKind>('track');

const sections: SettingsSection<ContentKind>[] = contentSections.map((section) => ({
  key: section.key,
  icon: section.icon,
  title: section.title,
  caption: section.caption,
  flush: true,
  hideFooter: true,
}));

/** Lists only one account's content, from ?owner= */
const ownerId = computed(() => (route.query.owner ? Number(route.query.owner) : null));

const clearOwner = () => void router.replace({ query: { ...route.query, owner: undefined } });

useMeta(() => ({
  title: 'Content',
  titleTemplate: (title) => `${title} - Toneflix Music`,
}));
</script>
