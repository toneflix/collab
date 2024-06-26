<template>
  <Card />
</template>

<script setup lang="ts">
import { nextTick } from 'process';
import tippy, { Instance, Props } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { onMounted, getCurrentInstance, PropType, ref, watch, h } from 'vue';

const props = defineProps({
  tag: {
    type: String as PropType<
      'div' | 'span' | 'a' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5'
    >,
    default: 'div',
  },
  trigger: {
    type: String as PropType<
      'click' | 'mouseenter focus' | 'focusin' | 'mouseenter click' | 'manual'
    >,
    default: 'click',
  },
  content: {
    type: String,
  },
  themeColor: {
    type: String,
  },
  themeBorder: {
    type: String,
  },
  themeBg: {
    type: String,
  },
  interactive: Boolean,
});

const instance = getCurrentInstance();
const cardId = ref(instance?.uid);
const Card = h({
  render: () => {
    return h(
      props.tag,
      {
        id: `hc-${cardId.value}`,
        class: 'cursor-pointer hover-card z-[1]',
      },
      [
        [
          instance?.slots.default && instance?.slots.default(),
          h(
            'div',
            {
              id: `hc-content-${cardId.value}`,
              class: 'hidden',
            },
            instance?.slots.content && instance?.slots.content(),
          ),
        ],
      ],
    );
  },
});

const tippyInstance = ref<Instance<Props>>();

const content = () => {
  const el = document.querySelector(`#hc-content-${cardId.value}`);
  const body = document.querySelector('body');

  props.themeBg &&
    body?.style.setProperty('--hc-theme-backgroud', props.themeBg);

  props.themeColor &&
    body?.style.setProperty('--hc-theme-color', props.themeColor);

  body?.style.setProperty(
    '--hc-theme-border',
    props.themeBorder || props.themeColor || 'rgb(156 163 175 / 1)',
  );

  const [insts] = tippy(`#hc-${cardId.value}`, {
    interactive: props.interactive,
    allowHTML: true,
    trigger: props.trigger,
    theme: 'custom',
    content: !instance?.slots.content
      ? props.content
      : () => {
          const content = el?.cloneNode(true) as HTMLElement;
          content.classList.remove('hidden');
          return content;
        },
  });

  tippyInstance.value = insts;
};

onMounted(() => {
  nextTick(content);
});

watch([() => instance?.slots.content, () => props.content], () => {
  if (tippyInstance.value) {
    tippyInstance.value.destroy();
  }
  content();
});
</script>

<style lang="scss">
body {
  --hc-theme-backgroud: var(--q-dark);
  --hc-theme-color: white;
  --hc-theme-border: rgb(156 163 175 / 1);
}
.tippy-box[data-theme~='custom'] {
  background-color: var(--hc-theme-backgroud);
  color: var(--hc-theme-color);
  border-width: 1px;
  border-style: solid;
  border-color: var(--hc-theme-border);

  &[data-placement^='top'] > .tippy-arrow::before {
    border-top-color: var(--hc-theme-border);
  }
  &[data-placement^='bottom'] > .tippy-arrow::before {
    border-bottom-color: var(--hc-theme-border);
  }
  &[data-placement^='left'] > .tippy-arrow::before {
    border-left-color: var(--hc-theme-border);
  }
  &[data-placement^='right'] > .tippy-arrow::before {
    border-right-color: var(--hc-theme-border);
  }
  &[data-placement^='top'] > .tippy-arrow {
    bottom: -1px;
  }
  &[data-placement^='bottom'] > .tippy-arrow {
    top: -1px;
  }
}
</style>
