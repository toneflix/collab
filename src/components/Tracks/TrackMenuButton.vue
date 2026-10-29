<template>
  <IconBtn
    class="track-menu-btn"
    icon="lucide-ellipsis-vertical"
    label="More actions"
    :tooltip="false"
    @click.prevent.stop="open"
  />
</template>

<script setup lang="ts">
import { openTrackMenu, type TrackMenuContext } from 'src/utils/track-menu';
import type { Track } from 'src/utils/models';

/**
 * The ⋮ button on a track row. On desktop it shows while the row is hovered
 * (see `.track-row` in components.scss).
 */
const props = defineProps<{
  track: Track;
  context?: TrackMenuContext;
}>();

const open = (event: MouseEvent) => openTrackMenu(event, props.track, props.context);
</script>
