<template>
  <div class="flex items-center gap-3 flex-nowrap">
    <q-avatar rounded size="48px" class="flex-none! bg-grey-9">
      <img :src="item.image" v-if="item.image" />
      <q-icon :name="icons[item.type]" size="20px" color="grey-5" v-else />
    </q-avatar>
    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <q-badge rounded color="grey-8" class="flex-none!" :label="item.type" />
        <component
          :is="item.link ? 'router-link' : 'span'"
          :to="item.link || undefined"
          class="font-bold truncate"
        >
          {{ item.title }}
        </component>
        <q-badge rounded color="red-9" class="flex-none!" label="Taken down" v-if="item.takenDown && !hideStatus" />
      </div>
      <div class="text-xs truncate text-grey-5">
        {{ item.subtitle }}
        <template v-if="showOwner && item.owner && item.type !== 'user'"> · owned by {{ item.owner.name }}</template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModeratedItem } from 'src/utils/requests/moderation';

withDefaults(defineProps<{ item: ModeratedItem; showOwner?: boolean; hideStatus?: boolean }>(), {
  showOwner: false,
  hideStatus: false,
});

const icons: Record<ModeratedItem['type'], string> = {
  release: 'lucide-disc-3',
  track: 'lucide-music',
  sound: 'lucide-audio-waveform',
  song: 'lucide-quote',
  project: 'lucide-folder',
  comment: 'lucide-message-square',
  user: 'lucide-user',
};
</script>
