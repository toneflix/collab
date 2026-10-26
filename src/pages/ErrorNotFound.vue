<template>
  <div class="fullscreen bg-page text-center q-pa-md flex flex-center">
    <div>
      <div
        class="font-display font-black leading-none text-primary text-[28vh]"
      >
        404
      </div>

      <div class="mt-4 text-2xl font-semibold font-display">Nothing here</div>
      <p class="mt-2 text-fg-muted">
        The page you're looking for moved or never existed.
      </p>

      <q-btn
        unelevated
        no-caps
        color="primary"
        class="q-mt-xl"
        to="/"
        label="Go home"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ErrorNotFound',
});
</script>
