<template>
  <section class="home-join">
    <div>
      <h2 class="text-2xl font-bold text-white font-circlular-std md:text-4xl">
        {{ signedIn ? 'Get more out of every session' : 'Your next track starts here' }}
      </h2>
      <p class="max-w-xl mt-2 leading-relaxed text-white/85">
        <template v-if="signedIn">
          Premium lets you sell releases and stems, take tips, and gives you
          more storage, collaborators and AI credits.
        </template>
        <template v-else>
          Create a free account to start projects, join collabs and follow the
          creators you like.
        </template>
      </p>
    </div>

    <div class="flex flex-wrap gap-3 !flex-none">
      <template v-if="signedIn">
        <q-btn
          unelevated
          rounded
          no-caps
          size="lg"
          color="white"
          text-color="dark"
          icon="lucide-crown"
          label="See Premium plans"
          class="!flex-none font-bold"
          :to="{ name: 'premium' }"
        />
      </template>
      <template v-else>
        <q-btn
          unelevated
          rounded
          no-caps
          size="lg"
          color="white"
          text-color="dark"
          label="Create a free account"
          class="!flex-none font-bold"
          :to="{ name: 'auth.register' }"
        />
        <q-btn
          flat
          rounded
          no-caps
          size="lg"
          text-color="white"
          label="Sign in"
          class="!flex-none"
          :to="{ name: 'auth.login' }"
        />
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps({
  signedIn: Boolean,
});
</script>

<style lang="scss" scoped>
.home-join {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 40px 32px;
  border-radius: 24px;
  background: linear-gradient(120deg, #0369a1 0%, #03bfff 55%, #7c3aed 130%);

  @media (max-width: 1023px) {
    padding: 28px 20px;
  }
}
</style>
