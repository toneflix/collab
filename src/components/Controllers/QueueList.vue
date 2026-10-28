<template>
  <!-- The play queue in play order. Picking a track plays it. -->
  <q-list dark>
    <q-item
      clickable
      :key="`${item.id}-${i}`"
      :active="i === player.index"
      active-class="queue-list__current"
      :ref="(el) => i === player.index && (currentItem = el as unknown as { $el: HTMLElement })"
      @click="player.jumpTo(i)"
      v-for="(item, i) in player.ordered"
    >
      <q-item-section avatar>
        <div class="relative">
          <q-img no-spinner class="rounded bg-gray-700" width="40px" height="40px" :src="item.imageUrl" />
          <div class="queue-list__badge" v-if="i === player.index">
            <q-icon :name="player.playing ? 'lucide-pause:fill' : 'lucide-play:fill'" size="18px" />
          </div>
        </div>
      </q-item-section>
      <q-item-section>
        <q-item-label lines="1" class="font-bold">{{ item.title }}</q-item-label>
        <q-item-label caption lines="1">
          <RouterLink
            class="hover:underline"
            :to="{ name: 'project', params: { project_id: item.project.slug } }"
            @click.stop="emit('navigate')"
            v-if="item.project"
          >
            {{ item.project.title }}
          </RouterLink>
          <RouterLink
            class="hover:underline"
            :to="{ name: 'artist', params: { artist_id: item.artist.username } }"
            @click.stop="emit('navigate')"
            v-else-if="item.artist?.username"
          >
            {{ item.artist.name }}
          </RouterLink>
          <template v-else>{{ item.artist?.name || 'Unknown' }}</template>
        </q-item-label>
      </q-item-section>
      <q-item-section side class="text-xs" v-if="item.duration">
        {{ formatSeconds(item.duration) }}
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { formatSeconds } from 'src/utils/helpers';
import { usePlayerStore } from 'src/stores/player-store';

/** Fires when an artist link leaves the player, so the parent can close it */
const emit = defineEmits<{ navigate: [] }>();

const player = usePlayerStore();
const currentItem = ref<{ $el: HTMLElement } | null>(null);

/** Brings the playing track into view. */
const scrollToCurrent = async () => {
  await nextTick();
  currentItem.value?.$el?.scrollIntoView({ block: 'center' });
};

onMounted(scrollToCurrent);
defineExpose({ scrollToCurrent });
</script>

<style lang="scss" scoped>
:deep(.queue-list__current) {
  background: rgba(255, 255, 255, 0.1);
  color: #03bfff;
}

.queue-list__badge {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
}
</style>
