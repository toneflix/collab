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
            class="grid grid-cols-1 gap-6 mt-8 md:grid-cols-2"
            @submit="send($router)"
          >
            <div>
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
                v-model="form.firstname"
              />
            </div>

            <div>
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
                v-model="form.lastname"
              />
            </div>

            <div>
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
                v-model="form.email"
              />
            </div>

            <div>
              <label class="block mb-2 text-xl text-gray-400">
                Phone number
              </label>
              <q-input
                outlined
                color="primary"
                class="custom-q-class"
                input-class="custom-input-class"
                placeholder="+123 987 654 3210"
                v-model="form.phone"
              />
            </div>

            <div>
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
                v-model="form.password"
              />
            </div>

            <div>
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
                v-model="form.password_confirmation"
              />
            </div>

            <div
              class="flex items-center justify-start col-span-2 no-wrap q-py-md"
            >
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

            <div class="justify-between md:flex md:items-center md:col-span-2">
              <q-btn
                no-caps
                type="submit"
                color="primary"
                class="text-xl rounded-lg"
                label="Create your account"
                icon-right="chevron_right"
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
import { ref } from 'vue';

const form = ref({
  firstname: '',
  lastname: '',
  password: '',
  password_confirmation: '',
  accept: false,
  email: '',
  phone: '',
});

const send = (r: { replace: (p: { name: string }) => void }) => {
  r.replace({ name: 'home' });
};
</script>
