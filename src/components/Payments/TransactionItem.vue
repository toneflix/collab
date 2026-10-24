<template>
  <q-item :to="link">
    <q-item-section avatar>
      <q-avatar rounded color="grey-9">
        <img
          :src="transaction.item.imageUrl"
          v-if="transaction.item?.imageUrl"
        />
        <q-icon :name="icon" v-else />
      </q-avatar>
    </q-item-section>
    <q-item-section>
      <q-item-label class="font-bold">{{ title }}</q-item-label>
      <q-item-label caption>
        {{ label }}
        <template v-if="transaction.payer">
          from {{ transaction.payer.fullname || transaction.payer.username }}
        </template>
        · {{ when }}
      </q-item-label>
      <q-item-label caption class="italic" v-if="transaction.message">
        “{{ transaction.message }}”
      </q-item-label>
    </q-item-section>
    <q-item-section side>
      <q-item-label class="font-bold text-white">
        {{ price(transaction.earned ?? transaction.amount) }}
      </q-item-label>
      <q-item-label caption v-if="transaction.earned !== undefined && transaction.purpose !== 'adjustment'">
        of {{ price(transaction.amount) }}
      </q-item-label>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouteLocationRaw } from 'vue-router';
import { date } from 'quasar';
import { usePayments } from 'src/composables/usePayments';
import { Transaction } from 'src/utils/models';

const props = defineProps<{
  transaction: Transaction;
}>();

const { price } = usePayments();

const labels = {
  premium: 'Premium',
  release: 'Release',
  stems: 'Stems',
  tip: 'Tip',
  credits: 'AI credits',
  adjustment: 'Balance adjustment',
};

const icons = {
  premium: 'fas fa-crown',
  release: 'fas fa-compact-disc',
  stems: 'fas fa-layer-group',
  tip: 'fas fa-hand-holding-heart',
  credits: 'fas fa-wand-magic-sparkles',
  adjustment: 'fas fa-scale-balanced',
};

const label = computed(() => labels[props.transaction.purpose] || 'Payment');
const icon = computed(
  () => icons[props.transaction.purpose] || 'fas fa-receipt',
);

const title = computed(() => {
  const t = props.transaction;
  if (t.purpose === 'premium')
    return t.planName || `Premium (${t.plan || 'monthly'})`;
  if (t.purpose === 'tip' && t.item) return `Tip to ${t.item.title}`;
  if (t.purpose === 'credits') return t.planName || label.value;
  return t.item?.title || label.value;
});

const when = computed(() =>
  date.formatDate(
    props.transaction.paidAt || props.transaction.createdAt,
    'MMM D, YYYY',
  ),
);

const link = computed<RouteLocationRaw | undefined>(() => {
  const item = props.transaction.item;
  if (props.transaction.purpose === 'adjustment') return undefined;
  if (!item) return { name: 'premium' };
  if (item.type === 'user')
    return { name: 'creator', params: { artist_id: item.username } };
  if (!item.artist) return undefined;
  if (item.type === 'release') {
    return {
      name: 'artist.album',
      params: { artist_id: item.artist, album_id: item.slug },
    };
  }
  return {
    name: 'artist.track',
    params: { artist_id: item.artist, track_id: item.slug },
  };
});
</script>
