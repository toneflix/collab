<template>
  <q-page padding>
    <article class="about">
      <h1 class="text-3xl font-bold">About Toneflix Music</h1>

      <p class="about__lead">
        Toneflix Music is a community-driven music platform that brings artists,
        producers, creators and music lovers together through streaming,
        discovery, music creation and collaboration.
      </p>

      <p>
        We believe music is more than something you listen to. It is something
        you create, share, discover and experience together. Listeners explore
        new music, artists share their releases, producers show off their sound,
        and creators meet, collaborate and bring new ideas to life.
      </p>

      <p>
        Our vision is a thriving music community where creativity is
        encouraged, talent is discovered and real connections are made through
        music. By bringing listening and creating closer together, we want
        music to be more engaging, accessible and community driven.
      </p>

      <p>
        Whether you are finding your next favourite song, sharing your latest
        release, exploring new sounds, looking for creative partners or working
        on your next project, Toneflix Music is built for every side of your
        musical journey.
      </p>

      <p class="about__tagline">
        Toneflix Music is where music meets community, creativity and
        collaboration.
      </p>

      <div class="flex flex-wrap gap-3 mt-8">
        <q-btn
          unelevated
          rounded
          no-caps
          color="primary"
          label="Explore music"
          class="!flex-none"
          :to="{ name: 'explore' }"
        />
        <q-btn
          outline
          rounded
          no-caps
          label="Read the FAQ"
          class="!flex-none"
          :to="{ name: 'help', hash: '#faq' }"
        />
      </div>
    </article>
  </q-page>
</template>

<script setup lang="ts">
import { useMeta } from 'quasar';

const description =
  'Toneflix Music brings artists, producers, creators and music lovers together through streaming, discovery, music creation and collaboration.';

useMeta({
  title: 'About',
  titleTemplate: (title) => `${title} - Toneflix Music`,
  meta: {
    description: { name: 'description', content: description },
    ogTitle: { property: 'og:title', content: 'About Toneflix Music' },
    ogDescription: { property: 'og:description', content: description },
  },
});
</script>

<style lang="scss" scoped>
.about {
  max-width: 760px;
  margin: 0 auto;

  p {
    margin: 16px 0 0;
    line-height: 1.7;
    color: var(--tf-text-muted);
  }

  &__lead {
    font-size: 1.15rem;
    color: var(--tf-text) !important;
  }

  &__tagline {
    padding: 16px 20px;
    border: 1px solid var(--tf-border);
    border-radius: var(--tf-radius-lg);
    background:
      linear-gradient(135deg, var(--tf-primary-soft), transparent 70%),
      var(--tf-surface-1);
    font-weight: 700;
    color: var(--tf-text) !important;
  }
}
</style>
