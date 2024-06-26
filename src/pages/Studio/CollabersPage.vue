<template>
  <q-page>
    <div class="max-w-full p-4 mx-auto md:max-w-2xl lg:max-w-3xl">
      <div class="flex justify-start gap-4 mt-4 mb-2">
        <h4 class="text-xl !flex-none font-semibold md:text-2xl">Collabers</h4>
      </div>
      <q-list class="grid grid-cols-1 md:grid-cols-2">
        <q-item
          clickable
          :to="{ name: 'artist', params: { artist_id: artist.username } }"
          :key="artist.id"
          v-for="artist in artistList"
        >
          <q-item-section avatar>
            <q-avatar rounded color="gray-400" text-color="white">
              <q-img no-spinner :src="artist.imageUrl" />
            </q-avatar>
          </q-item-section>

          <q-item-section>{{ artist.name }}</q-item-section>
          <q-item-section side top>
            <TDropdown
              flat
              dense
              rounded
              icon="fas fa-ellipsis"
              dropdown-icon="none"
              color="white"
              :links="[
                {
                  label: 'Block',
                  icon: 'fas fa-user-lock',
                },
              ]"
              @click.stop.prevent
            />
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import TDropdown from 'src/components/Utilities/TDropdown.vue';
import { artistList } from 'src/utils/dummy';
</script>
