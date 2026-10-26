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
        class="relative flex items-center w-full max-w-3xl p-8 mx-auto lg:px-12 lg:w-3/5"
      >
        <div class="w-full">
          <h1
            class="text-2xl font-semibold tracking-wider text-gray-300 capitalize"
          >
            Password Reset.
          </h1>

          <p class="mt-8 text-lg text-gray-300">
            Let’s help you setup your new password.
          </p>

          <q-form
            class="grid grid-cols-2 gap-6 mt-8"
            @submit="send"
            v-if="!done"
          >
            <div class="flex flex-col col-span-2 gap-4" v-if="!valid">
              <label class="block mb-2 text-xl text-center text-gray-400">
                Enter your Recovery Code
                <span class="text-center text-red-500">*</span>
              </label>
              <CodeInput
                rounded
                gap="5px"
                borders="btlr"
                input-class="text-weight-bold"
                primary-color="var(--q-accent)"
                secondary-color="var(--q-primary)"
                border-width="1px"
                font-size="2em"
                font-family="monospace"
                v-model="form.code"
                :fields="6"
                :field-width="55"
                :field-height="55"
                :required="true"
                @change="errors.code = ''"
                @complete="send"
              />
              <small
                class="w-full text-lg text-center text-negative"
                v-if="errors.code"
              >
                {{ errors.code }}
              </small>
              <div class="text-center">
                <q-btn
                  flat
                  dense
                  no-caps
                  type="submit"
                  color="primary"
                  class="!flex-none text-xl"
                  label="Request New Code"
                  :to="{ name: 'auth.forgot' }"
                  :loading="loading"
                />
              </div>
            </div>
            <template v-else>
              <div class="col-span-2">
                <label class="block mb-2 text-xl text-gray-400">
                  Password
                  <span class="text-center text-red-500">*</span>
                </label>
                <q-input
                  outlined
                  required
                  hide-bottom-space
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

              <div class="col-span-2">
                <label class="block mb-2 text-xl text-gray-400">
                  Confirm password
                  <span class="text-center text-red-500">*</span>
                </label>
                <q-input
                  outlined
                  required
                  hide-bottom-space
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
            </template>

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
                class="inline-block w-full mt-12 text-xl text-center text-white md:!mt-0 md:mx-6 hover:text-gray-400 md:w-auto"
              >
                Login Instead?
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
          <div
            v-else
            class="flex flex-col items-center justify-center gap-5 p-5 mt-12 text-center bg-gray-200 rounded-3xl text-success"
          >
            <q-icon name="fas fa-check-circle" size="5em" />
            <h5 class="text-2xl leading-none text-gray-600">{{ message }}</h5>
            <q-btn
              rounded
              no-caps
              unelevated
              class="text-lg"
              color="primary"
              :to="{ name: 'auth.login' }"
            >
              Login Now
            </q-btn>
          </div>
        </div>
        <q-inner-loading :showing="loading" />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import CodeInput from 'src/components/Utilities/CodeInput.vue';
import { useForm } from 'alova/client';
import { useMeta } from 'quasar';
import { alova } from 'src/boot/alova';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { ResponseBody } from 'src/utils/models';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
// import { useRouter } from 'vue-router';

const route = useRoute();
const config = computed(() => useBootstrapStore().configuration);
const message = ref<null | string>(null);
// const router = useRouter();
const errors = computed(
  () => (error.value as unknown as ResponseBody<string>)?.errors || {},
);

const done = ref(false);
const valid = ref(false);

const { form, send, error, loading, onError, onSuccess } = useForm(
  (form) =>
    alova.Post<ResponseBody<Record<string, string>>>(
      valid.value ? 'auth/reset-password' : 'auth/reset-password/check-code',
      form,
    ),
  {
    initialForm: {
      code: '',
      password: '',
      password_confirmation: '',
    },
  },
);

onSuccess(({ data }) => {
  if (!valid.value) {
    valid.value = !valid.value;
  } else {
    done.value = true;
    message.value = data.message;
  }
});

onError(() => {
  form.value.code = '';
});

useMeta(() => ({
  title: 'Password Reset',
  titleTemplate: (title) => `${title} - ${config.value.app_name}`,
}));

watch(
  () => route.query.token as string,
  (code) => {
    if (code) {
      form.value.code = code;
      send();
    }
  },
  { immediate: true },
);
</script>
