<template>
  <router-link
    class="block mx-auto md:w-44"
    :class="{ 'w-28': dense, 'w-32': !dense }"
    :to="{
      name: creator.type === 'user' ? 'creator' : 'artist',
      params: { artist_id: creator.username },
    }"
    v-intersection="onIntersect"
  >
    <q-card flat square class="w-full bg-transparent cursor-pointer">
      <q-avatar
        round
        class="!rounded-full md:w-44 md:h-44"
        :class="{ 'w-28 h-28': dense, 'w-32 h-32': !dense }"
      >
        <q-img
          no-spinner
          class="bg-gray-400"
          loading="eager"
          :ratio="1 / 1"
          :src="creator.imageUrl"
        />
      </q-avatar>

      <q-card-section align="center" class="p-1">
        <h6
          class="!text-gray-300 text-md md:text-lg w-32 md:w-40 overflow-hidden text-nowrap text-ellipsis"
        >
          <q-icon
            name="verified"
            color="toneflix"
            class="verified-badge"
            v-if="creator.verified"
          />
          <q-icon
            color="orange"
            class="verified-badge"
            :name="specialIcon[0]"
            v-if="specialIcon && specialIcon[1](creator.id)"
          />
          {{ creator.name }}
        </h6>
        <div class="text-gray-400 text-subtitle2">
          {{
            creator.type === 'user'
              ? intStr(creator.projectsCount) + ' Projects'
              : ''
          }}
          <span class="!flex-none" v-if="creator.type === 'user'">•</span>
          {{
            intStr(
              creator.type === 'artist'
                ? creator.followers
                : creator.reputation,
            )
          }}
          {{ creator.type === 'artist' ? 'Followers' : 'Reps.' }}
        </div>
      </q-card-section>
    </q-card>
  </router-link>
</template>

<script setup lang="ts">
import { intStr } from 'src/utils/helpers';
import { Artist, User } from 'src/utils/models';
import { PropType } from 'vue';

const emit = defineEmits<{
  scrollEnd: [value: boolean];
}>();

const props = defineProps({
  dense: Boolean,
  isLast: Boolean,
  specialIcon: Object as PropType<[string, (p: string | number) => boolean]>,
});

const creator = defineModel<User | Artist>('creator', {
  required: true,
});

const onIntersect = (evt: IntersectionObserverEntry): boolean => {
  if (props.isLast && evt.isIntersecting) {
    emit('scrollEnd', true);
  }
  return true;
};
</script>
