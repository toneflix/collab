<template>
  <router-link
    class="block mx-auto md:w-44"
    :class="{ 'w-28': dense, 'w-32': !dense }"
    :to="{
      name: 'project',
      params: { project_id: project.slug },
    }"
  >
    <q-card flat square class="w-full bg-transparent cursor-pointer">
      <q-avatar
        round
        class="!rounded-2xl md:w-44 md:h-44"
        :class="{ 'w-28 h-28': dense, 'w-32 h-32': !dense }"
      >
        <q-img
          no-spinner
          class="bg-gray-400"
          loading="eager"
          :ratio="1 / 1"
          :src="project.imageUrl"
        />
      </q-avatar>

      <q-card-section align="left" class="p-1">
        <h6
          class="!text-gray-300 text-md md:text-lg w-28 md:w-40 overflow-hidden text-nowrap text-ellipsis"
        >
          {{ project.title }}
        </h6>
        <div class="text-gray-400 text-subtitle2">
          {{ project.collaboratorsCount }} Collabers
          <span class="!flex-none">•</span>
          {{ project.props }} Props.
        </div>
      </q-card-section>
    </q-card>
  </router-link>
</template>

<script setup lang="ts">
import { Project } from 'src/utils/models';

defineProps({
  dense: Boolean,
});

const project = defineModel<Project>('project', {
  required: true,
});
</script>
