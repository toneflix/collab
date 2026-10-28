<template>
  <div>
    <IconBtn size="sm" icon="lucide-pencil" :color="color" :disable="disable" />
    <q-popup-edit title="Rename" v-model="name" v-slot="scope">
      <div class="gap-2 column">
        <q-input
          dense
          outlined
          autofocus
          type="text"
          class="custom-q-class no-fill"
          input-class="custom-input-class"
          v-model="scope.value"
          @keyup.enter="scope.set(), emit('saved')"
        />

        <div class="flex gap-2">
          <q-btn color="negative" label="Cancel" @click="scope.cancel" />
          <q-btn color="positive" label="Save" @click="scope.set(), emit('saved')" />
        </div>
      </div>
    </q-popup-edit>
  </div>
</template>

<script setup lang="ts">
/** A pencil button that opens a rename box; the new name is the v-model, `saved` follows. */
defineProps<{
  color?: string;
  disable?: boolean;
}>();

const emit = defineEmits<{ saved: [] }>();

const name = defineModel<string | undefined>();
</script>
