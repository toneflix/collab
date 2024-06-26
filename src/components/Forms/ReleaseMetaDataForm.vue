<template>
  <div class="grid gap-y-6 md:grid-cols-2 md:gap-x-6">
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
          <q-icon name="info" />
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
        required
        color="primary"
        class="custom-q-class no-fill"
        input-class="custom-input-class"
        placeholder="e.g. USS9X0004321"
        :error="!!errors.isrc || !!errors['release.isrc']"
        :error-message="errors.isrc || errors['release.isrc']"
        v-model="form.isrc"
      />
    </div>
    <div class="col-span-2 md:col-span-1">
      <label class="block mb-2 text-xl text-gray-400"> Publisher </label>
      <q-input
        outlined
        required
        color="primary"
        class="custom-q-class no-fill"
        input-class="custom-input-class"
        :error="!!errors.composer || !!errors['release.composer']"
        :error-message="errors.composer || errors['release.composer']"
        v-model="form.publisher"
      />
    </div>
    <div class="col-span-2 md:col-span-1">
      <label class="block mb-2 text-xl text-gray-400"> Composer </label>
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
      <label class="block mb-2 text-xl text-gray-400"> Record Label </label>
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
          <q-icon name="event" class="cursor-pointer">
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
          <q-icon name="info" />
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
        required
        color="primary"
        class="custom-q-class no-fill"
        input-class="custom-input-class"
        :error="!!errors.iswc || !!errors['release.iswc']"
        :error-message="errors.iswc || errors['release.iswc']"
        placeholder="e.g. T-056.789.012-1"
        v-model="form.iswc"
      />
    </div>
    <div class="col-span-2 md:col-span-1">
      <label class="block mb-2 text-xl text-gray-400">
        P Line
        <HoverCard
          trigger="click"
          class="inline-flex items-center justify-center"
        >
          <q-icon name="info" />
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
    <div class="col-span-2 md:col-span-1">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import HoverCard from 'src/components/Cards/HoverCard.vue';
import { Release, UploadData } from 'src/utils/models';

const form = defineModel<Release & UploadData>('form', {
  required: true,
});

const errors = defineModel<Record<string, string>>('errors', {
  required: false,
  default: {},
});
</script>
