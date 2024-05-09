<template>
  <div class="atropos my-atropos">
    <div class="atropos-scale">
      <div class="atropos-rotate">
        <div class="relative atropos-inner">
          <slot>
            <q-img
              no-spinner
              loading="eager"
              class="w-48 h-48 bg-gray-400 rounded-2xl md:h-72 md:w-72"
              data-atropos-offset="0"
              :src="mainImage"
            />
            <div
              data-atropos-offset="5"
              class="absolute top-0 bottom-0 left-0 right-0 flex flex-row items-end justify-end p-3"
            >
              <slot name="button"> </slot>
            </div>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Atropos from 'atropos';
import { onMounted } from 'vue';

defineProps({
  mainImage: {
    type: String,
    required: true,
  },
});
onMounted(() => {
  Atropos({
    el: '.my-atropos',
    activeOffset: 40,
    shadowScale: 1.05,
  });
});
</script>
