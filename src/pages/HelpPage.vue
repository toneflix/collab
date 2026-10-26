<template>
  <q-page padding>
    <div class="help">
      <div class="help__intro">
        <h1 class="text-3xl font-bold">Help and FAQ</h1>
        <p class="text-fg-muted">
          Answers to common questions, and how to reach us when you need more.
        </p>
        <q-input
          outlined
          rounded
          clearable
          placeholder="Search questions"
          class="mt-4"
          aria-label="Search questions"
          v-model="search"
        >
          <template #prepend>
            <q-icon name="lucide-search" />
          </template>
        </q-input>
      </div>

      <div id="faq">
        <section
          class="help__section"
          :key="group.title"
          v-for="group in groups"
        >
          <h2 class="help__heading">
            <q-icon :name="group.icon" size="18px" />
            {{ group.title }}
          </h2>
          <q-list class="help__list">
            <q-expansion-item
              dense-toggle
              expand-separator
              header-class="help__question"
              :label="item.q"
              :key="item.q"
              v-for="item in group.items"
            >
              <div class="help__answer">{{ item.a }}</div>
            </q-expansion-item>
          </q-list>
        </section>
      </div>

      <SimpleInfo
        icon="lucide-search-x"
        text="No questions match that search."
        v-if="!groups.length"
      />

      <section id="support" class="help__support">
        <div>
          <h2 class="help__heading">
            <q-icon name="lucide-life-buoy" size="18px" />
            Still need help?
          </h2>
          <p class="text-fg-muted">
            {{ discord ? 'Ask the community or write to us.' : 'Write to us.' }}
            We reply to emails within two working days.
          </p>
        </div>
        <div class="help__contacts">
          <q-btn
            unelevated
            rounded
            no-caps
            color="primary"
            icon="lucide-message-circle"
            label="Join the Discord"
            target="_blank"
            rel="noopener"
            :href="discord"
            v-if="discord"
          />
          <q-btn
            outline
            rounded
            no-caps
            icon="lucide-mail"
            :label="email"
            :href="`mailto:${email}`"
          />
        </div>
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMeta } from 'quasar';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';

useMeta({ title: 'Help and FAQ' });

const boot = useBootstrapStore();
const search = ref('');
const email = computed(() =>
  String(boot.configuration.app_email || 'support@toneflix.com.ng'),
);
const discord = computed(() => String(boot.configuration.discord_url || ''));
const share = computed(() => Number(boot.configuration.creator_share || 85));

const faq = computed(() => [
  {
    title: 'About Toneflix Music',
    icon: 'lucide-music',
    items: [
      {
        q: 'What is Toneflix Music?',
        a: 'A community-driven music platform that brings artists, producers, creators and music lovers together through streaming, discovery, music creation and collaboration.',
      },
      {
        q: 'Who can use Toneflix Music?',
        a: 'Anyone who loves music. Artists, producers, songwriters, content creators and listeners all have a place here.',
      },
      {
        q: 'What makes Toneflix Music different?',
        a: 'It puts listening, discovery and making music in the same place. You can stream a track, follow the people behind it and join them on their next project.',
      },
      {
        q: 'Can I discover new music here?',
        a: 'Yes. Browse trending tracks, new releases, genres and creators, search by tempo or key, and get recommendations based on what you play, like and follow.',
      },
      {
        q: 'Is Toneflix Music only for listeners?',
        a: 'No. Artists, producers and other creatives release and sell their music here, alongside the listeners who discover and support their work.',
      },
      {
        q: 'Can artists and producers use Toneflix Music?',
        a: 'Yes. Release songs and albums, sell releases and stems, receive tips, claim your artist profile and open your projects to collaborators.',
      },
      {
        q: 'Does Toneflix Music support music creation and collaboration?',
        a: 'Yes. Start a project, invite collaborators and build tracks from stems in the studio, all in your browser. Write lyrics in the Composer and chat with your collaborators beside the work.',
      },
      {
        q: 'Is Toneflix Music a social network?',
        a: 'In part. You can follow artists and creators, comment, send messages and join projects, but everything centres on music.',
      },
      {
        q: 'How can I get involved?',
        a:
          'Create a free account, follow the artists you like, and start a project or ask to join one that is open to collaborators.' +
          (discord.value ? ' You can also join our Discord.' : ''),
      },
      {
        q: 'What is the mission behind Toneflix Music?',
        a: 'To make music more connected, collaborative and community driven, by bringing listeners and creators together in one place for discovery, creativity and shared musical experiences.',
      },
    ],
  },
  {
    title: 'Getting started',
    icon: 'lucide-sparkles',
    items: [
      {
        q: 'Do I need to pay to use it?',
        a: 'No. Listening, projects, the studio and releasing are free. Premium adds downloads, a profile badge, higher limits and AI tools.',
      },
      {
        q: 'How do I change my name, photo or password?',
        a: 'Open your profile menu and choose Settings. Your username sets the link to your public page.',
      },
    ],
  },
  {
    title: 'Projects and the studio',
    icon: 'lucide-audio-lines',
    items: [
      {
        q: 'How do I invite someone to a project?',
        a: 'Open the project in the studio and add a collaber. They get an invitation in their notifications and can accept or decline it.',
      },
      {
        q: 'What are stems?',
        a: 'The separate parts of a track, such as vocals, drums or bass. Each stem has its own lane in the studio, where you can trim, fade, add effects and mix it.',
      },
      {
        q: 'Why do my stems load quickly the second time?',
        a: 'The studio keeps a copy of each stem on your device, so reopening a track only downloads what changed.',
      },
      {
        q: 'What is the Composer?',
        a: 'A notepad for lyrics. It counts syllables, colours rhymes and can suggest lines with AI. A composition can be turned into a project track when it is ready.',
      },
    ],
  },
  {
    title: 'Releases and earnings',
    icon: 'lucide-circle-dollar-sign',
    items: [
      {
        q: 'How do I release a song?',
        a: 'From the studio, choose New Release, add the tracks and details, and publish. Releases are checked before they go live.',
      },
      {
        q: 'How much do I keep from sales and tips?',
        a: `You keep ${share.value}% of each payment for releases, stems and tips. The rest covers payment fees and running Toneflix.`,
      },
      {
        q: 'How do I withdraw my earnings?',
        a: 'Add a payout account on the Earnings page, then withdraw. The payment provider depends on your country.',
      },
    ],
  },
  {
    title: 'Rights and safety',
    icon: 'lucide-shield',
    items: [
      {
        q: 'Something of mine was taken down. What can I do?',
        a: 'Open Takedowns in the studio to see the reason. If it was a mistake, for example because you own the rights or have a licence, you can appeal once.',
      },
      {
        q: 'How do I report content or an account?',
        a: 'Use the flag button on the track, release or profile. Moderators review every report.',
      },
    ],
  },
]);

const groups = computed(() => {
  const term = (search.value || '').trim().toLowerCase();

  if (!term) {
    return faq.value;
  }

  return faq.value
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        `${item.q} ${item.a}`.toLowerCase().includes(term),
      ),
    }))
    .filter((group) => group.items.length);
});
</script>

<style lang="scss" scoped>
.help {
  max-width: 760px;
  margin: 0 auto;

  &__intro {
    margin-bottom: 32px;
  }

  &__section {
    margin-bottom: 28px;
  }

  &__heading {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 10px;
    font-size: 1.05rem;
    font-weight: 700;
    line-height: 1.4;
  }

  &__list {
    overflow: hidden;
    border: 1px solid var(--tf-border);
    border-radius: var(--tf-radius-lg);
    background: var(--tf-surface-1);

    :deep(.help__question) {
      padding: 12px 16px;
      font-weight: 500;
    }
  }

  &__answer {
    padding: 0 16px 16px;
    line-height: 1.6;
    color: var(--tf-text-muted);
  }

  &__support {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 12px;
    padding: 20px;
    border: 1px solid var(--tf-border);
    border-radius: var(--tf-radius-xl);
    background:
      linear-gradient(135deg, var(--tf-primary-soft), transparent 70%),
      var(--tf-surface-1);

    p {
      margin: 0;
    }
  }

  &__contacts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    > * {
      flex: none;
    }
  }
}
</style>
