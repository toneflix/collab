<template>
  <div class="grid gap-y-4 md:grid-cols-2 md:gap-x-4">
    <div class="col-span-2 md:col-span-1">
      <label class="block mb-2 text-xl text-gray-400"> Contains Music </label>
      <q-select
        outlined
        required
        emit-value
        map-options
        color="primary"
        class="custom-q-class no-fill"
        label="Contains Music"
        input-class="custom-input-class"
        :options="[
          { label: 'Yes', value: 1 },
          { label: 'No', value: 0 },
        ]"
        :error="!!errors.contains_music || !!errors['release.contains_music']"
        :error-message="
          errors.contains_music || errors['release.contains_music']
        "
        v-model="form.contains_music"
      />
    </div>
    <div class="col-span-2 md:col-span-1">
      <label class="block mb-2 text-xl text-gray-400">
        ISRC
        <HoverCard
          trigger="click"
          class="inline-flex items-center justify-center"
        >
          <q-icon name="lucide-info" />
          <template #content>
            <p>
              An ISRC (International Standard Recording Code) is a unique
              identifier that is assigned to a track. Use the same ISRC for a
              given track wherever you distribute it.
            </p>
            <br />
            <p>
              If you work with a record label or distributor, ask them if they
              already have ISRCs for your tracks.
            </p>
          </template>
        </HoverCard>
      </label>
      <q-input
        outlined
        color="primary"
        class="custom-q-class no-fill"
        input-class="custom-input-class"
        hint="Optional"
        placeholder="e.g. USS9X0004321"
        :error="!!errors.isrc || !!errors['release.isrc']"
        :error-message="errors.isrc || errors['release.isrc']"
        v-model="form.isrc"
      />
    </div>
    <div class="col-span-2 md:col-span-1">
      <label class="block mb-2 text-xl text-gray-400">
        Publisher
        <span class="text-center text-red-500">*</span>
      </label>
      <q-input
        outlined
        required
        color="primary"
        class="custom-q-class no-fill"
        input-class="custom-input-class"
        :error="!!errors.publisher || !!errors['release.publisher']"
        :error-message="errors.publisher || errors['release.publisher']"
        v-model="form.publisher"
      />
    </div>
    <div class="col-span-2 md:col-span-1">
      <label class="block mb-2 text-xl text-gray-400">
        Composer
        <span class="text-center text-red-500">*</span>
      </label>
      <q-input
        outlined
        required
        color="primary"
        class="custom-q-class no-fill"
        input-class="custom-input-class"
        :error="!!errors.composer || !!errors['release.composer']"
        :error-message="errors.composer || errors['release.composer']"
        v-model="form.composer"
      />
    </div>
    <div class="col-span-2">
      <q-separator />
    </div>
    <div class="col-span-2 md:col-span-1">
      <label class="block mb-2 text-xl text-gray-400">
        Record Label
        <span class="text-center text-red-500">*</span>
      </label>
      <q-input
        outlined
        required
        color="primary"
        class="custom-q-class no-fill"
        input-class="custom-input-class"
        :error="!!errors.record_label || !!errors['release.record_label']"
        :error-message="errors.record_label || errors['release.record_label']"
        v-model="form.record_label"
      />
    </div>
    <div class="col-span-2 md:col-span-1">
      <label class="block mb-2 text-xl text-gray-400"> Release Date </label>
      <q-input
        outlined
        hide-bottom-space
        mask="date"
        fill-mask="0"
        class="custom-q-class no-fill"
        input-class="custom-input-class"
        :rules="['date']"
        :error="!!errors.releaseDate || !!errors['release.releaseDate']"
        :error-message="errors.releaseDate || errors['release.releaseDate']"
        v-model="form.releaseDate"
      >
        <template v-slot:append>
          <q-icon name="lucide-calendar" class="cursor-pointer">
            <q-popup-proxy
              cover
              transition-show="scale"
              transition-hide="scale"
            >
              <q-date v-model="form.releaseDate">
                <div class="items-center justify-end row">
                  <q-btn v-close-popup label="Close" color="primary" flat />
                </div>
              </q-date>
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
    </div>
    <div class="col-span-2 md:col-span-1">
      <label class="block mb-2 text-xl text-gray-400">
        ISWC
        <HoverCard
          trigger="click"
          class="inline-flex items-center justify-center"
        >
          <q-icon name="lucide-info" />
          <template #content>
            <p>
              The ISWC (International Standard Musical Work Code) is a unique,
              permanent and internationally recognized reference number for the
              identification of musical works.
            </p>
          </template>
        </HoverCard>
      </label>
      <q-input
        outlined
        color="primary"
        class="custom-q-class no-fill"
        input-class="custom-input-class"
        hint="Optional"
        :error="!!errors.iswc || !!errors['release.iswc']"
        :error-message="errors.iswc || errors['release.iswc']"
        placeholder="e.g. T-056.789.012-1"
        v-model="form.iswc"
      />
    </div>
    <div class="col-span-2 md:col-span-1">
      <label class="block mb-2 text-xl text-gray-400">
        P Line
        <span class="text-center text-red-500">*</span>
        <HoverCard
          trigger="click"
          class="inline-flex items-center justify-center"
        >
          <q-icon name="lucide-info" />
          <template #content>
            <p>
              P-line notice identify the owner of the rights in the original
              sound recording (the masters) at the time that the CD/carrier/file
              is manufactured.
            </p>
          </template>
        </HoverCard>
      </label>
      <q-input
        outlined
        required
        color="primary"
        class="custom-q-class no-fill"
        input-class="custom-input-class"
        :error="!!errors.pline || !!errors['release.pline']"
        :error-message="errors.pline || errors['release.pline']"
        :placeholder="`e.g. ${new Date().getFullYear()} ABC Music Limited`"
        v-model="form.pline"
      />
    </div>
    <div class="col-span-2">
      <label class="block mb-2 text-xl text-gray-400"> Topics </label>
      <TopicSelect
        hint="Moods and subjects, like Heartbreak or Joy. Up to 10."
        :initial="form.topics"
        :error="!!topicError"
        :error-message="topicError"
        v-model="form.topic_ids"
      />
    </div>
    <div class="col-span-2">
      <q-separator />
    </div>
    <div class="col-span-2 md:col-span-1">
      <label class="block mb-2 text-xl text-gray-400"> Price </label>
      <q-input
        outlined
        type="number"
        min="0"
        color="primary"
        class="custom-q-class no-fill"
        input-class="custom-input-class"
        hint="Fans pay this once to stream the whole release. Leave at 0 to make it free."
        :prefix="symbol"
        :error="!!errors.price || !!errors['release.price']"
        :error-message="errors.price || errors['release.price']"
        v-model.number="form.price"
      />
    </div>
    <div class="flex flex-col items-start col-span-2 gap-1 md:col-span-1">
      <q-checkbox
        label="Contains explicit content"
        :true-value="1"
        :false-value="0"
        v-model="form.explicit"
      />
      <p
        class="text-sm text-negative"
        v-if="errors.privacy || !!errors['release.explicit']"
      >
        {{ errors.privacy || errors['release.explicit'] }}
      </p>
      <q-checkbox
        label="Allow downloads"
        :true-value="1"
        :false-value="0"
        v-model="form.downloadable"
      />
      <p class="pl-10 text-xs text-grey-6">
        Listeners whose plan includes downloads can save these tracks.
        <template v-if="Number(form.price) > 0">
          Buyers can always download a paid release.
        </template>
        <template v-if="downloadsOff">
          Downloads are turned off on Toneflix Music right now.
        </template>
      </p>
      <p class="text-sm text-negative" v-if="errors['release.downloadable']">
        {{ errors['release.downloadable'] }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import HoverCard from 'src/components/Cards/HoverCard.vue';
import TopicSelect from 'src/components/Forms/TopicSelect.vue';
import { Release, UploadData } from 'src/utils/models';
import { usePayments } from 'src/composables/usePayments';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { computed } from 'vue';

const { symbol } = usePayments();
const boot = useBootstrapStore();
const downloadsOff = computed(
  () => boot.configuration.track_downloads === false,
);

const form = defineModel<Release & UploadData>('form', {
  required: true,
});

const errors = defineModel<Record<string, string>>('errors', {
  required: false,
  default: () => ({}),
});

const topicError = computed(
  () =>
    errors.value.topics ||
    Object.entries(errors.value).find(([key]) => key.startsWith('topics.'))?.[1],
);
</script>
