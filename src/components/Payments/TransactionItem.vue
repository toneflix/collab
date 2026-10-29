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
      <q-item-label caption v-if="transaction.earned !== undefined && !['adjustment', 'referral', 'streams'].includes(transaction.purpose)">
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
  referral: 'Invite reward',
  streams: 'Streams',
};

const icons = {
  premium: 'lucide-crown',
  release: 'lucide-disc-3',
  stems: 'lucide-layers',
  tip: 'lucide-hand-heart',
  credits: 'lucide-wand-sparkles',
  adjustment: 'lucide-scale',
  referral: 'lucide-user-plus',
  streams: 'lucide-audio-lines',
};

const label = computed(() => labels[props.transaction.purpose] || 'Payment');
const icon = computed(
  () => icons[props.transaction.purpose] || 'lucide-receipt',
);

const title = computed(() => {
  const t = props.transaction;
  if (t.purpose === 'premium')
    return t.planName || `Premium (${t.plan || 'monthly'})`;
  if (t.purpose === 'tip' && t.item) return `Tip to ${t.item.title}`;
  if (t.purpose === 'credits') return t.planName || label.value;
  if (t.purpose === 'referral' && t.item) return `Payment by ${t.item.title || t.item.username}`;
  if (t.purpose === 'streams' && t.item) return `Streams in ${t.item.title}`;
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
  if (props.transaction.purpose === 'adjustment' || props.transaction.purpose === 'streams') return undefined;
  if (!item) return { name: 'premium' };
  if (item.type === 'user' || item.type === 'invite')
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
