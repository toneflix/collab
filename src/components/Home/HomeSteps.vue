<template>
  <section class="home-steps">
    <div class="max-w-xl">
      <h2 class="text-2xl font-bold text-white font-circlular-std md:text-3xl">How a collab comes together</h2>
      <p class="mt-2 leading-relaxed text-gray-400">
        Every song on Toneflix starts as a project. Keep it private while you
        work, or open it up so other creators can find it and ask to join.
      </p>
    </div>

    <ol class="grid gap-6 mt-8 md:grid-cols-3">
      <li :key="step.title" class="home-step" v-for="(step, i) in steps">
        <span class="home-step__number">{{ i + 1 }}</span>
        <div>
          <h3 class="text-lg font-bold text-white">{{ step.title }}</h3>
          <p class="mt-1 text-sm leading-relaxed text-gray-400">{{ step.text }}</p>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
const steps = [
  {
    title: 'Start a project',
    text: 'Name it, pick a genre and drop in your first idea: a beat, a voice note or a full demo.',
  },
  {
    title: 'Build it with others',
    text: 'Collaborators add stems, write lyrics and leave notes. Every change is saved as a version you can go back to.',
  },
  {
    title: 'Release it',
    text: 'Mix it down, publish it to listeners and share what it earns with the people who made it.',
  },
];
</script>

<style lang="scss" scoped>
.home-steps {
  padding: 40px 32px;
  border-radius: 24px;
  background:
    radial-gradient(circle at 100% 0%, rgba(167, 139, 250, 0.16), transparent 45%),
    #14161e;
  border: 1px solid rgba(255, 255, 255, 0.06);

  @media (max-width: 1023px) {
    padding: 28px 20px;
  }
}

.home-step {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.home-step__number {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-weight: 700;
  color: #03bfff;
  border: 1px solid rgba(3, 191, 255, 0.5);
}
</style>
