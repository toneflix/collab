<template>
  <section>
    <HomeShelfHeader
      title="Everything a track needs, in one place"
      subtitle="From the first idea to the release, without passing files around."
    />

    <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
      <router-link
        :key="feature.title"
        :to="feature.to"
        class="home-feature"
        v-for="feature in features"
      >
        <span class="home-feature__icon" :style="{ color: feature.color, background: `${feature.color}1f` }">
          <q-icon :name="feature.icon" size="24px" />
        </span>
        <h3 class="mt-8 text-lg font-bold text-white">{{ feature.title }}</h3>
        <p class="mt-2 text-sm leading-relaxed text-gray-400">{{ feature.text }}</p>
        <span class="home-feature__more">
          {{ feature.action }}
          <q-icon name="lucide-arrow-right" size="16px" />
        </span>
      </router-link>
    </div>
  </section>
</template>

<script setup lang="ts">
import HomeShelfHeader from 'src/components/Home/HomeShelfHeader.vue';
import { RouteLocationRaw } from 'vue-router';

interface Feature {
  title: string;
  text: string;
  icon: string;
  color: string;
  action: string;
  to: RouteLocationRaw;
}

const features: Feature[] = [
  {
    title: 'A studio that goes with you',
    text: 'Arrange stems on a multitrack editor, record takes, program drums and notes, and add effects.',
    icon: 'lucide-sliders-horizontal',
    color: '#03bfff',
    action: 'Open the studio',
    to: { name: 'studio.home' },
  },
  {
    title: 'Collaborate on projects',
    text: 'Invite producers, writers and vocalists to a project, chat beside the work and keep every version of every track.',
    icon: 'lucide-users',
    color: '#a78bfa',
    action: 'Browse projects',
    to: { name: 'projects' },
  },
  {
    title: 'AI that helps you finish',
    text: 'Split a song into stems, sketch ideas, transcribe lyrics and tag tempo and key, all from the same project.',
    icon: 'lucide-zap',
    color: '#fbbf24',
    action: 'See the tools',
    to: { name: 'studio.home' },
  },
  {
    title: 'Release and get paid',
    text: 'Publish songs and albums, sell stems, receive tips from fans and withdraw your earnings to your bank.',
    icon: 'lucide-award',
    color: '#34d399',
    action: 'Start a release',
    to: { name: 'studio.releases' },
  },
];
</script>

<style lang="scss" scoped>
.home-feature {
  display: flex;
  flex-direction: column;
  padding: 24px;
  border-radius: 20px;
  background: #171922;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease;

  @media (max-width: 639px) {
    padding: 18px;
  }

  &:hover {
    transform: translateY(-3px);
    border-color: rgba(3, 191, 255, 0.4);
  }
}

.home-feature__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
}

.home-feature__more {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  padding-top: 18px;
  font-size: 14px;
  font-weight: 600;
  color: #03bfff;
}
</style>
