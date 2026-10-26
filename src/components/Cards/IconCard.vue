<template>
  <q-skeleton
    class="block h-full bg-gray-400 cursor-pointer min-h-28"
    :class="!noAnimation ? 'transition ease-linear hover:scale-105' : ''"
    v-bind="$attrs"
    v-if="skeleton"
  >
    <q-avatar
      square
      color="gray-400"
      class="w-full absolute-top"
      :size="dense ? '5em' : '10rem'"
    >
      <q-icon
        name="lucide-circle-question-mark"
        color="grey-3"
        :size="dense ? '1em' : '6rem'"
      />
    </q-avatar>
    <q-skeleton
      type="QBtn"
      class="flex justify-center flex-none w-8 m-1 items-center !rounded-full absolute-top-right h-8"
    >
      <q-icon name="lucide-ellipsis" />
    </q-skeleton>

    <q-card-section
      class="flex justify-center px-2 bg-gray-500 absolute-bottom"
      :class="dense ? 'py-2' : ''"
    >
      <q-skeleton type="text" width="70%" class="flex-none" />
    </q-card-section>
  </q-skeleton>
  <q-card
    v-else
    flat
    class="block h-full cursor-pointer"
    :class="!noAnimation ? 'transition ease-linear hover:scale-105' : ''"
    v-bind="$attrs"
  >
    <q-avatar color="blue-1" class="w-full" :size="dense ? '5em' : '10rem'">
      <q-icon
        :name="icon"
        :color="color.replace('bg-', '')"
        :size="dense ? '1em' : '6rem'"
      />
    </q-avatar>
    <TDropdown
      flat
      dense
      rounded
      icon="lucide-ellipsis"
      dropdown-icon="none"
      class="m-1 absolute-top-right"
      color="dark"
      :links="links"
      v-if="links"
      @click.stop.prevent
    />

    <q-card-section
      class="px-2 text-center"
      :class="[dense ? 'py-2' : '', 'bg-' + color.replace('bg-', '')]"
    >
      <div class="items-center row no-wrap" v-if="title">
        <div class="text-sm col ellipsis">
          {{ title }}
        </div>
        <slot name="title"></slot>
      </div>
      <div class="text-gray-200 text-subtitle1" v-if="description">
        {{ description }}
      </div>
      <slot name="body"></slot>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { PropType } from 'vue';
import TDropdown from '../Utilities/TDropdown.vue';
import { Link } from 'src/utils/models';

defineProps({
  icon: String,
  title: String,
  dense: Boolean,
  links: Array as PropType<Link[]>,
  color: { type: String, default: 'secondary' },
  skeleton: Boolean,
  noAnimation: Boolean,
  description: String,
});
</script>
