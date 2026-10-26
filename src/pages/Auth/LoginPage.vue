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
            Welcome back.
          </h1>

          <p class="mt-8 text-lg text-gray-300">
            Sign in to pick up your projects and the music you follow.
          </p>

          <q-form class="grid grid-cols-2 gap-6 mt-8" @submit="send($router)">
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
                autocomplete="username"
                :error="!!errors.email"
                :error-message="errors.email"
                v-model="form.email"
              />
            </div>

            <div class="col-span-2">
              <label class="block mb-2 text-xl text-gray-400">
                Password
                <span class="text-center text-red-500">*</span>
              </label>
              <q-input
                outlined
                required
                type="password"
                color="primary"
                class="custom-q-class"
                input-class="custom-input-class"
                placeholder="Enter your password"
                autocomplete="current-password"
                :error="!!errors.password"
                :error-message="errors.password"
                v-model="form.password"
              />
            </div>

            <div class="col-span-2">
              <q-checkbox
                v-model="form.remember"
                class="text-lg"
                label="Remember Me"
              />
            </div>

            <div class="justify-between col-span-2 md:flex md:items-center">
              <q-btn
                no-caps
                type="submit"
                color="primary"
                class="w-full text-xl rounded-lg md:w-auto"
                label="Login"
                icon-right="lucide-chevron-right"
                :loading="loading"
              />

              <router-link
                :to="{ name: 'auth.forgot' }"
                class="inline-block w-full mt-12 text-xl text-center text-white md:!mt-0 md:mx-6 hover:text-gray-400 md:w-auto"
              >
                Forgot your password?
              </router-link>
            </div>

            <div class="justify-center col-span-2 md:flex md:items-center">
              <router-link
                :to="{ name: 'auth.register' }"
                class="inline-block w-full mt-12 text-xl text-center text-white md:!mt-0 md:mx-6 hover:text-gray-400 md:w-auto"
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
import { computed } from 'vue';
import { useMeta } from 'quasar';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { useForm } from 'alova/client';
import { alova } from 'src/boot/alova';
import { reboot } from 'src/utils/proccessor';
import { ResponseBody, User } from 'src/utils/models';
import { useRoute, useRouter } from 'vue-router';

const config = computed(() => useBootstrapStore().configuration);
const route = useRoute();
const router = useRouter();
const errors = computed(
  () => (error.value as unknown as ResponseBody<string>)?.errors || {},
);

const { form, send, error, loading, onSuccess } = useForm(
  (form) =>
    alova.Post<ResponseBody<User>>('auth/login', form, {
      params: { with: 'permissions,roles' },
    }),
  {
    initialForm: {
      remember: false,
      password: '',
      email: '',
    },
  },
);

onSuccess(({ data }) => {
  reboot().then(() => {
    if (data.data) {
      useBootstrapStore().saveAuthUser(data.data, data.token);

      // Return to the page that asked for a login, when it is one of ours
      const redirect = route.query.redirect;

      if (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')) {
        router.replace(redirect);
      } else {
        router.replace({ name: 'studio.home' });
      }
    }
  });
});

useMeta(() => ({
  title: 'Login',
  titleTemplate: (title) => `${title} - ${config.value.app_name}`,
}));
</script>
