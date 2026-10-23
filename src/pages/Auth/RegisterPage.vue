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
            Get started.
          </h1>

          <p class="mt-4 text-lg text-gray-300">
            Let’s get you all set up so you can verify your account and begin
            collaborating.
          </p>

          <q-form
            class="grid mt-8 gap-y-6 md:grid-cols-2 md:gap-x-6"
            @submit="send"
          >
            <div class="col-span-2 md:col-span-1">
              <label class="block mb-2 text-xl text-gray-400">
                First Name
                <span class="text-center text-red-500">*</span>
              </label>
              <q-input
                outlined
                required
                color="primary"
                class="custom-q-class"
                input-class="custom-input-class"
                placeholder="John"
                autocomplete="first-name"
                v-model="form.firstname"
                :error="!!errors.firstname"
                :error-message="errors.firstname"
              />
            </div>

            <div class="col-span-2 md:col-span-1">
              <label class="block mb-2 text-xl text-gray-400">
                Last name
                <span class="text-center text-red-500">*</span>
              </label>
              <q-input
                outlined
                required
                color="primary"
                class="custom-q-class"
                input-class="custom-input-class"
                placeholder="Snow"
                autocomplete="family-name"
                v-model="form.lastname"
                :error="!!errors.lastname"
                :error-message="errors.lastname"
              />
            </div>

            <div class="col-span-2 md:col-span-1">
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

            <div class="col-span-2 md:col-span-1">
              <label class="block mb-2 text-xl text-gray-400">
                Phone number
              </label>
              <q-input
                outlined
                color="primary"
                class="custom-q-class"
                input-class="custom-input-class"
                placeholder="+123 987 654 3210"
                autocomplete="tel"
                :error="!!errors.phone"
                :error-message="errors.phone"
                v-model="form.phone"
              />
            </div>

            <div class="col-span-2 md:col-span-1">
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
                autocomplete="new-password"
                :error="!!errors.password"
                :error-message="errors.password"
                v-model="form.password"
              />
            </div>

            <div class="col-span-2 md:col-span-1">
              <label class="block mb-2 text-xl text-gray-400">
                Confirm password
                <span class="text-center text-red-500">*</span>
              </label>
              <q-input
                outlined
                required
                type="password"
                color="primary"
                class="custom-q-class"
                input-class="custom-input-class"
                placeholder="Re-enter your password"
                autocomplete="new-password"
                :error="!!errors.password_confirmation"
                :error-message="errors.password_confirmation"
                v-model="form.password_confirmation"
              />
            </div>

            <div class="w-full col-span-2 q-py-md">
              <div class="flex items-center justify-start gap-4 no-wrap">
                <q-checkbox
                  outline
                  color="primary"
                  class="flex-none"
                  size="sm"
                  v-model="form.accept"
                />
                <p class="text-lg text-left cursor-pointer q-py-none">
                  <span @click="form.accept = !form.accept">
                    By signing up, you accept our
                  </span>
                  <router-link
                    :to="{
                      name: 'home',
                    }"
                  >
                    <span class="text-info">Terms of Service</span>
                  </router-link>
                  <span @click="form.accept = !form.accept"> and </span>
                  <router-link
                    :to="{
                      name: 'home',
                    }"
                  >
                    <span class="text-info">Privacy Policy.</span>
                  </router-link>
                </p>
              </div>
              <small class="text-sm text-negative" v-if="errors.accept">
                {{ errors.accept }}
              </small>
            </div>

            <div
              class="justify-between text-center md:flex md:items-center md:col-span-2"
            >
              <q-btn
                no-caps
                type="submit"
                color="primary"
                class="mb-5 text-xl rounded-lg md:!mb-0"
                label="Create your account"
                icon-right="chevron_right"
                :loading="loading"
              />

              <router-link
                :to="{ name: 'auth.login' }"
                class="inline-block text-xl text-center text-white md:mt-0 md:mx-6 hover:text-gray-400"
              >
                Already have an account? Login Instead!
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
import { ResponseBody, User } from 'src/utils/models';
import { reboot } from 'src/utils/proccessor';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const errors = computed(
  () => (error.value as unknown as ResponseBody<string>)?.errors || {},
);

const { form, send, error, loading, onSuccess } = useForm(
  (form) =>
    alova.Post<ResponseBody<User>>('auth/register', form, {
      params: { with: 'permissions,roles' },
    }),
  {
    initialForm: {
      email: '',
      phone: '',
      lastname: '',
      firstname: '',
      accept: false,
      password: '',
      password_confirmation: '',
    },
  },
);

onSuccess(({ data }) => {
  reboot().then(() => {
    if (data.data) {
      useBootstrapStore().saveAuthUser(data.data, data.token);
      router.replace({ name: 'studio.home' });
    }
  });
});

useMeta(() => ({
  title: 'Create your account',
  titleTemplate: (title) =>
    `${title} - ${useBootstrapStore().configuration.app_name}`,
}));
</script>
