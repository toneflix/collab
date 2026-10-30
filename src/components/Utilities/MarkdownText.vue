<template>
  <!-- eslint-disable-next-line vue/no-v-html -- SafeMarkdown escapes raw HTML and unsafe links -->
  <div class="markdown-text" v-html="html" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { markdown } from 'src/utils/markdown';

const props = defineProps<{ text?: string | null }>();

const html = computed(() => markdown.render(props.text ?? ''));
</script>

<style lang="scss" scoped>
.markdown-text {
  :deep(p),
  :deep(ul),
  :deep(ol),
  :deep(pre),
  :deep(blockquote),
  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4) {
    margin: 0 0 8px;
  }

  :deep(> :last-child) {
    margin-bottom: 0;
  }

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4) {
    font-size: 15px;
    font-weight: 700;
    line-height: 1.4;
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 20px;
  }

  :deep(ul) {
    list-style: disc;
  }

  :deep(ol) {
    list-style: decimal;
  }

  :deep(li + li) {
    margin-top: 2px;
  }

  :deep(a) {
    color: var(--tf-primary);
    text-decoration: underline;
  }

  :deep(code) {
    padding: 1px 4px;
    font-size: 13px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
  }

  :deep(pre) {
    padding: 8px 10px;
    overflow-x: auto;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 8px;

    code {
      padding: 0;
      background: none;
    }
  }

  :deep(blockquote) {
    padding-left: 10px;
    border-left: 3px solid rgba(255, 255, 255, 0.2);
  }
}
</style>
