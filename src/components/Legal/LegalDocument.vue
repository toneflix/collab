<template>
  <q-page padding>
    <article class="legal">
      <h1 class="text-3xl font-bold">{{ title }}</h1>
      <p class="legal__updated">Last updated {{ updated }}</p>
      <p class="legal__intro" v-if="intro">{{ intro }}</p>

      <nav class="legal__toc" aria-label="Contents">
        <a :key="section.heading" :href="`#${slug(section.heading)}`" v-for="section in sections">
          {{ section.heading }}
        </a>
      </nav>

      <section :id="slug(section.heading)" :key="section.heading" v-for="section in sections">
        <h2>{{ section.heading }}</h2>
        <p :key="i" v-for="(paragraph, i) in section.body">{{ paragraph }}</p>
        <ul v-if="section.list">
          <li :key="item" v-for="item in section.list">{{ item }}</li>
        </ul>
      </section>

      <p class="legal__contact">
        Questions? Write to <a :href="`mailto:${email}`">{{ email }}</a>.
      </p>
    </article>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';

export type LegalSection = { heading: string; body: string[]; list?: string[] };

defineProps<{ title: string; updated: string; intro?: string; sections: LegalSection[] }>();

const boot = useBootstrapStore();
const email = computed(() => String(boot.configuration.app_email || 'support@toneflix.com.ng'));

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
</script>

<style lang="scss" scoped>
.legal {
  max-width: 760px;
  margin: 0 auto;
  padding-bottom: 48px;

  h2 {
    margin: 36px 0 0;
    font-size: 1.2rem;
    font-weight: 700;
    line-height: 1.4;
    scroll-margin-top: 80px;
  }

  p,
  li {
    line-height: 1.7;
    color: var(--tf-text-muted);
  }

  p {
    margin: 12px 0 0;
  }

  ul {
    margin: 12px 0 0;
    padding-left: 20px;
  }

  a {
    color: var(--tf-primary);
  }
}

.legal__updated {
  font-size: 14px;
  color: var(--tf-text-subtle) !important;
}

.legal__intro {
  font-size: 1.05rem;
  color: var(--tf-text) !important;
}

.legal__toc {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 24px;

  a {
    padding: 6px 12px;
    border: 1px solid var(--tf-border);
    border-radius: 999px;
    font-size: 13px;
    color: var(--tf-text-muted);

    &:hover {
      color: var(--tf-text);
      border-color: var(--tf-border-strong);
    }
  }
}

.legal__contact {
  margin-top: 40px !important;
  padding: 16px 20px;
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-lg);
  background: var(--tf-surface-1);
}
</style>
