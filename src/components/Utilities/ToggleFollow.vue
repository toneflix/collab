<template>
  <slot :submit="submit" :following="following">
    <q-btn
      color="primary"
      :outline="!following"
      :label="following ? labels.unfollow : labels.follow"
      @click="submit"
    />
  </slot>
</template>

<script setup lang="ts">
import { useForm } from '@alova/scene-vue';
import { alova } from 'src/boot/alova';
import { Artist, ResponseBody, User } from 'src/utils/models';
import { PropType } from 'vue';

type Labels = { follow: string; unfollow: string };

const emit = defineEmits<{
  (e: 'done', value: Artist | User): void;
}>();

const props = defineProps({
  labels: {
    type: Object as PropType<Labels>,
    default: () => ({ follow: 'Follow', unfollow: 'Unfollow' }),
  },
  baseUrl: {
    type: String,
    required: true,
  },
});

const following = defineModel<boolean>('following');

const { send, onSuccess } = useForm(
  (form) =>
    alova.Post<ResponseBody<Artist | User>>(`${props.baseUrl}/follows`, form),
  {
    initialForm: {},
  },
);

onSuccess(({ data }) => {
  following.value = data.data.youFollow;

  emit('done', data.data);
});

const submit = () => {
  following.value = !following.value;
  send();
};
</script>
