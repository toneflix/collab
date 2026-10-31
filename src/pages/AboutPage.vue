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

      <h2 class="about__heading">What you can do on Toneflix Music</h2>

      <section v-for="section in sections" :key="section.title" class="about__section">
        <div class="about__section-title">
          <q-icon :name="section.icon" size="22px" class="about__icon" />
          <h3>{{ section.title }}</h3>
        </div>

        <p v-for="text in section.paragraphs" :key="text">{{ text }}</p>
      </section>

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
          class="flex-none!"
          :to="{ name: 'explore' }"
        />
        <q-btn
          outline
          rounded
          no-caps
          label="Read the FAQ"
          class="flex-none!"
          :to="{ name: 'help', hash: '#faq' }"
        />
      </div>
    </article>
  </q-page>
</template>

<script setup lang="ts">
import { useMeta } from 'quasar';

interface AboutSection {
  icon: string;
  title: string;
  paragraphs: string[];
}

const sections: AboutSection[] = [
  {
    icon: 'lucide-headphones',
    title: 'Listen, discover and connect',
    paragraphs: [
      'Explore trending tracks, new releases, genres, albums and the artists and creators behind them. Search by title or by a line of the lyrics, and filter by tempo and key when you are looking for a particular sound. The more you play, like and follow, the better your recommendations get.',
      'Follow along with synced lyrics while a song plays, watch its music video in Up Next, build playlists and keep the tracks you love in your library. Follow the people you enjoy, comment on their work and message them directly, because every song here comes with a community around it.',
    ],
  },
  {
    icon: 'lucide-users',
    title: 'Make music together',
    paragraphs: [
      'Start a project in the studio and invite collaborators to build it with you. Each part of a track lives on its own lane, where you can record straight from your microphone, upload stems, trim, fade, add effects and mix, or sketch ideas with the drum machine and piano roll. Bring in sounds from your own library to fill the gaps.',
      'Talk about the work right where it happens. Chat and send voice notes beside the project, and point your collaborators to the exact moment of a stem you want to discuss. Earlier versions of your tracks are kept, so trying a bold idea never costs you the take you liked.',
    ],
  },
  {
    icon: 'lucide-pen-tool',
    title: 'Write songs and share them',
    paragraphs: [
      'The Composer is your smart songwriting assistant. It counts syllables, colours your rhymes and finds perfect, near and multi-syllable rhymes, words that sound alike, mean the same or often go together. When you are stuck, ask it for the next line, the next four lines, a whole verse or a better take on a line you already have. Write with your collaborators, go back to any earlier version, and turn a finished song into a project to record.',
      'Publish your compositions so other creators can read them, and choose whether they may fork them or record their own take. Forks keep the credit with the writer, so ideas travel through the community and the people who started them are never lost.',
    ],
  },
  {
    icon: 'lucide-sparkles',
    title: 'AI that works with your music',
    paragraphs: [
      'Our AI tools sit inside the studio and work on your own projects. Generate a loop or a full song from a prompt and your lyrics, pull vocals, drums and bass out of a finished mix, or select part of a stem and describe how it should change. Record a sample of your voice for your artist and new songs can be sung in it.',
      'Lyrics are transcribed and timed to the music for you, so your listeners can sing along. When a track is finished, turn it into a music video with singing shots of your artist and scenes cut to the beat. The AI tools come with Premium and run on AI credits.',
    ],
  },
  {
    icon: 'lucide-bot',
    title: 'AI Studio',
    paragraphs: [
      'Describe the albums, tracks and touch-ups you want in plain words, and AI Studio builds them in your studio step by step: artists, projects, music, mixes, artwork, lyrics and releases. It can also look after the work you already have, adding missing covers, syncing lyrics and writing descriptions, while you stay in charge of what goes out.',
    ],
  },
  {
    icon: 'lucide-disc-3',
    title: 'Release your music',
    paragraphs: [
      'Release a project straight from the studio with its credits, artwork and lyrics. Put out new versions later and retire the older ones when you are ready. You decide whether listeners may download your release, and you can sell releases and stems or receive tips from the fans who support you.',
    ],
  },
  {
    icon: 'lucide-hand-heart',
    title: 'Fair rewards for creators',
    paragraphs: [
      'Premium creators share in a monthly pool from signed-in streams of their released tracks. Music made together earns the most, then music recorded by people, then music made mostly with AI, so the work of real collaboration is valued above everything else.',
      'Invite friends with your own link and earn a share of what they spend for months after they join. Monthly reports show how each track, album and project is doing.',
    ],
  },
  {
    icon: 'lucide-wallet',
    title: 'Get paid where you live',
    paragraphs: [
      'Withdraw your earnings to a bank or mobile money account in your own currency. We pick the payout service that works in your country, and payments in the app are charged in your local currency too.',
    ],
  },
  {
    icon: 'lucide-shield',
    title: 'A safe home for your work',
    paragraphs: [
      'Every new track is checked against the music already on Toneflix Music, and copies of someone else\'s work are flagged for review. Anyone can report content, our moderators act quickly, and if your work is taken down you can appeal. Artists can claim their profiles, so the right people manage their names and music.',
    ],
  },
];

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

  &__heading {
    margin: 48px 0 0;
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.3;
  }

  &__section {
    margin-top: 32px;
  }

  &__section-title {
    display: flex;
    align-items: center;
    gap: 10px;

    h3 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      line-height: 1.4;
    }
  }

  &__icon {
    flex: none;
    color: var(--tf-primary);
  }

  &__tagline {
    margin-top: 40px !important;
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
