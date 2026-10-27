<template>
  <div
    class="auth-shell"
    :class="{ 'auth-shell--form-only': !split.banner }"
    :style="{
      '--auth-form': `${split.form}%`,
      '--auth-banner': `${split.banner}%`,
    }"
  >
    <section class="auth-shell__form">
      <router-link
        :to="{ name: 'index' }"
        class="auth-shell__logo"
        aria-label="Home"
      >
        <AppLogo :size="32" />
      </router-link>

      <div class="auth-shell__body">
        <slot />
      </div>

      <nav class="auth-shell__links">
        <router-link :to="{ name: 'terms' }">Terms</router-link>
        <router-link :to="{ name: 'privacy' }">Privacy</router-link>
        <router-link :to="{ name: 'help' }">Help</router-link>
      </nav>
    </section>

    <aside class="auth-shell__banner" aria-hidden="true" v-if="split.banner">
      <template v-if="auth.banner">
        <img :src="auth.banner" alt="" class="auth-shell__image" />
        <div class="auth-shell__shade"></div>
      </template>
      <div class="auth-shell__art" v-else>
        <div class="auth-shell__glow"></div>
        <div class="auth-shell__wave">
          <i :key="bar" :style="{ '--i': bar }" v-for="bar in 48"></i>
        </div>
      </div>

      <div class="auth-shell__copy">
        <span class="auth-shell__eyebrow" v-if="text('eyebrow')">{{
          text('eyebrow')
        }}</span>
        <h2 class="auth-shell__title font-display" v-if="text('title')">
          {{ text('title') }}
        </h2>
        <p class="auth-shell__text" v-if="text('text')">{{ text('text') }}</p>
        <ul class="auth-shell__points" v-if="points.length">
          <li :key="point" v-for="point in points">
            <q-icon name="lucide-check" size="16px" />
            {{ point }}
          </li>
        </ul>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { authText } from 'src/utils/auth-pages';

const boot = useBootstrapStore();
const auth = computed(() => boot.auth);
const split = computed(() => auth.value.split ?? { form: 45, banner: 55 });

const text = (key: string) => authText('banner', key);
const points = computed(() =>
  ['point_1', 'point_2', 'point_3'].map(text).filter(Boolean),
);
</script>

<style lang="scss" scoped>
.auth-shell {
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--tf-bg);
}

.auth-shell__form {
  display: flex;
  flex-direction: column;
  flex: 0 0 100%;
  min-width: 0;
  padding: 24px 20px;

  @media (min-width: 768px) {
    flex-basis: var(--auth-form);
    padding: 32px clamp(24px, 4vw, 64px);
  }
}

.auth-shell--form-only .auth-shell__form {
  flex-basis: 100%;
}

.auth-shell__body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1 1 auto;
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
  padding: 40px 0;
}

.auth-shell__body {
  :deep(.auth-title) {
    margin: 0;
    font-family: var(--tf-font-display);
    font-size: clamp(1.6rem, 2.4vw, 2rem);
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.01em;
    color: #fff;
  }

  :deep(.auth-subtitle) {
    margin: 8px 0 0;
    line-height: 1.55;
    color: var(--tf-text-muted);
  }

  :deep(.auth-form) {
    display: grid;
    gap: 16px;
    margin-top: 28px;
  }

  :deep(.auth-label) {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--tf-text-muted);
  }

  :deep(.auth-row) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  :deep(.auth-link) {
    font-weight: 600;
    color: var(--tf-primary);

    &:hover {
      color: var(--tf-primary-hover);
    }
  }

  :deep(.auth-submit) {
    width: 100%;
    min-height: 48px;
    border-radius: var(--tf-radius-lg);
    font-weight: 700;
  }

  :deep(.auth-footer) {
    margin: 24px 0 0;
    text-align: center;
    color: var(--tf-text-muted);
  }

  :deep(.auth-error) {
    font-size: 13px;
    color: var(--tf-danger);
  }

  :deep(.auth-done) {
    display: grid;
    justify-items: center;
    gap: 12px;
    padding: 32px 24px;
    border: 1px solid var(--tf-border);
    border-radius: var(--tf-radius-xl);
    text-align: center;
    background: var(--tf-surface-1);

    .q-icon {
      color: var(--tf-success);
    }
  }
}

.auth-shell__links {
  display: flex;
  justify-content: center;
  gap: 20px;
  font-size: 13px;

  a {
    color: var(--tf-text-subtle);

    &:hover {
      color: var(--tf-text);
    }
  }
}

.auth-shell__banner {
  position: relative;
  display: none;
  flex: 1 1 var(--auth-banner);
  min-width: 0;
  overflow: hidden;
  margin: 12px 12px 12px 0;
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-2xl);
  background: linear-gradient(160deg, #141a26 0%, #0d1118 55%, #0a1a22 100%);

  @media (min-width: 768px) {
    display: flex;
    align-items: flex-end;
  }
}

.auth-shell__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.auth-shell__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgb(5 7 10 / 92%),
    rgb(5 7 10 / 50%) 50%,
    transparent 80%
  );
}

.auth-shell__art {
  position: absolute;
  inset: 0;
}

.auth-shell__glow {
  position: absolute;
  top: -20%;
  right: -20%;
  width: 80%;
  aspect-ratio: 1;
  background: radial-gradient(circle, rgb(3 191 255 / 30%), transparent 65%);
}

.auth-shell__wave {
  position: absolute;
  top: 22%;
  left: 8%;
  right: 8%;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 160px;

  i {
    flex: 1 1 0;
    height: calc(20% + (sin(var(--i) * 0.5) * 0.5 + 0.5) * 80%);
    border-radius: 999px;
    background: linear-gradient(to top, var(--tf-primary), var(--tf-secondary));
    opacity: 0.75;
    transform-origin: center;
    animation: auth-wave 1.6s ease-in-out infinite alternate;
    animation-delay: calc(var(--i) * -0.09s);
  }
}

@keyframes auth-wave {
  from {
    transform: scaleY(0.35);
  }
  to {
    transform: scaleY(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-shell__wave i {
    animation: none;
  }
}

.auth-shell__copy {
  position: relative;
  z-index: 1;
  max-width: 520px;
  padding: clamp(24px, 4vw, 56px);
}

.auth-shell__eyebrow {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--tf-primary);
  background: var(--tf-primary-soft);
}

.auth-shell__title {
  margin: 16px 0 0;
  font-size: clamp(1.75rem, 3vw, 2.75rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #fff;
}

.auth-shell__text {
  margin: 12px 0 0;
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--tf-text-muted);
}

.auth-shell__points {
  display: grid;
  gap: 10px;
  margin: 24px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--tf-text);
  }

  .q-icon {
    flex: none;
    padding: 4px;
    border-radius: 999px;
    color: var(--tf-on-primary);
    background: var(--tf-primary);
  }
}
</style>
