<template>
  <slot :open="open">
    <q-btn
      dense
      no-caps
      rounded
      unelevated
      size="sm"
      padding="0 sm"
      color="toneflix"
      icon="lucide-hand-heart"
      label="Tip"
      @click="open"
    />
  </slot>

  <q-dialog v-model="show">
    <q-card class="w-full max-w-sm bg-dark">
      <q-card-section class="flex items-center gap-3">
        <q-avatar size="48px" class="!flex-none">
          <img :src="creator.imageUrl" />
        </q-avatar>
        <div>
          <div class="text-lg font-bold">Tip {{ creator.name }}</div>
          <div class="text-xs text-grey-5">
            Show some love. {{ share }}% goes straight to them.
          </div>
        </div>
      </q-card-section>

      <q-card-section class="pt-0">
        <div class="flex flex-wrap gap-2 mb-4">
          <q-chip
            class="!flex-none"
            clickable
            :key="preset"
            v-for="preset in presets"
            :color="amount === preset ? 'toneflix' : 'grey-9'"
            text-color="white"
            @click="amount = preset"
          >
            {{ price(preset) }}
          </q-chip>
        </div>
        <q-input
          dark
          filled
          dense
          type="number"
          label="Amount"
          v-model.number="amount"
          :min="minimum"
          :prefix="symbol"
          :rules="[(v) => v >= minimum || `The smallest tip is ${price(minimum)}`]"
        />
        <q-input
          dark
          filled
          dense
          autogrow
          counter
          maxlength="280"
          label="Message (optional)"
          class="mt-2"
          v-model="message"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat no-caps label="Cancel" v-close-popup />
        <PayButton
          unelevated
          rounded
          color="toneflix"
          :disable="amount < minimum"
          :label="`Send ${price(amount)}`"
          :amount="amount"
          :body="{
            purpose: 'tip',
            id: creator.username || creator.id,
            amount,
            message: message || undefined,
          }"
          @paid="onPaid"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PayButton from './PayButton.vue';
import { usePayments } from 'src/composables/usePayments';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { Artist, Transaction } from 'src/utils/models';

defineProps<{
  creator: Artist;
}>();

const emit = defineEmits<{
  tipped: [transaction: Transaction];
}>();

const boot = useBootstrapStore();
const { price, symbol } = usePayments();

const show = ref(false);
const message = ref('');
const minimum = computed(() => Number(boot.configuration.min_tip_amount || 100));
const share = computed(() => Number(boot.configuration.creator_share || 85));
const presets = computed(() => [1, 5, 10, 20].map((x) => x * minimum.value * 5));
const amount = ref(0);

const open = () => {
  amount.value = presets.value[0] || minimum.value;
  show.value = true;
};

const onPaid = (transaction: Transaction) => {
  show.value = false;
  message.value = '';
  emit('tipped', transaction);
};

defineExpose({ open });
</script>
