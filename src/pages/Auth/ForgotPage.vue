<template>
  <q-page>
    <div class="flex justify-center min-h-screen">
      <div
        class="hidden bg-cover lg:!block lg:w-2/5"
        style="
          background-image: url('https://lorem.toneflix.com.ng/images/image/00033?w=1080&h=1920');
        "
      ></div>

      <div
        class="flex items-center w-full max-w-3xl p-8 mx-auto lg:px-12 lg:w-3/5"
      >
        <div class="w-full">
          <h1
            class="text-2xl font-semibold tracking-wider text-gray-300 capitalize"
          >
            Account Recovery.
          </h1>

          <p class="mt-4 text-lg text-gray-300">
            Let’s help you recover your account.
          </p>

          <q-form class="grid grid-cols-2 gap-6 mt-8" @submit="send">
            <div class="col-span-2">
              <label class="block mb-2 text-xl text-gray-400">
                Email address
                <span class="text-center text-red-500">*</span>
              </label>
              <q-input
                outlined
                required
                color="primary"
                class="custom-q-class"
                input-class="custom-input-class"
                placeholder="jsnow@example.com"
                autocomplete="email"
                :error="!!errors.email"
                :error-message="errors.email"
                v-model="form.email"
              />
            </div>

            <div class="justify-between col-span-2 md:flex md:items-center">
              <q-btn
                no-caps
                type="submit"
                color="primary"
                class="w-full text-xl rounded-lg md:w-auto"
                label="Proceed"
                icon-right="chevron_right"
                :loading="loading"
              />

              <router-link
                :to="{ name: 'auth.login' }"
                class="inline-block w-full mt-5 text-xl text-center text-white md:!mt-0 md:mx-6 hover:text-gray-400 md:w-auto"
              >
                Login Instead?
              </router-link>
            </div>

            <div class="justify-center col-span-2 md:flex md:items-center">
              <router-link
                :to="{ name: 'auth.register' }"
                class="inline-block w-full mt-5 text-xl text-center text-white md:!mt-0 md:mx-6 hover:text-gray-400 md:w-auto"
              >
                Don't have an account? Create one!
              </router-link>
            </div>
          </q-form>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useForm } from 'alova/client';
import { useMeta } from 'quasar';
import { alova } from 'src/boot/alova';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { ResponseBody } from 'src/utils/models';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const config = computed(() => useBootstrapStore().configuration);
const router = useRouter();
const errors = computed(
  () => (error.value as unknown as ResponseBody<string>)?.errors || {},
);

const { form, send, error, loading, onSuccess } = useForm(
  (form) =>
    alova.Post<ResponseBody<Record<string, string>>>(
      'auth/forgot-password',
      form,
    ),
  {
    initialForm: {
      email: '',
    },
  },
);

onSuccess(({ data }) => {
  if (data.data) {
    router.replace({ name: 'reset.password' });
  }
});

useMeta(() => ({
  title: 'Forgot Password',
  titleTemplate: (title) => `${title} - ${config.value.app_name}`,
}));
</script>
