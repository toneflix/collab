<template>
  <slot :submit="submit" :active="active">
    <q-btn color="primary" :outline="!active" :label="label" @click="submit" />
  </slot>
</template>

<script setup lang="ts">
import { useForm } from '@alova/scene-vue';
import { alova } from 'src/boot/alova';
import { Interaction, ResponseBody } from 'src/utils/models';
import { PropType } from 'vue';

type Type = 'like' | 'save' | 'prop';

const emit = defineEmits<{
  (e: 'done', interaction: Interaction): void;
}>();

const props = defineProps({
  type: {
    type: String as PropType<Type>,
    default: 'like',
  },
  label: {
    type: String,
    default: 'Like',
  },
  baseUrl: {
    type: String,
    required: true,
  },
});

const active = defineModel<boolean>('active');

const { form, send, onSuccess } = useForm(
  (form) =>
    alova.Post<ResponseBody<Interaction>>(
      `${props.baseUrl}/interactions`,
      form,
    ),
  {
    initialForm: {
      list: undefined,
      state: !active.value,
      public: undefined,
      interaction: props.type,
    },
  },
);

onSuccess(({ data }) => {
  if (props.type === 'like') {
    active.value = data.data.liked;
  } else if (props.type === 'save') {
    active.value = data.data.saved;
  }

  emit('done', data.data);
});

const submit = () => {
  active.value = !active.value;
  form.value.state = active.value;
  send();
};
</script>
