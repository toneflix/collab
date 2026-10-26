<template>
  <q-layout view="hHh lpR fFf">
    <q-header reveal class="text-white bg-dark" v-if="!$route.meta.hideHeader">
      <q-toolbar class="py-4 bg-dark">
        <q-toolbar-title>
          <div>
            <img src="~/assets/logo.png" class="h-10 cursor-pointer" />
          </div>
        </q-toolbar-title>
        <q-space />
        <div class="flex gap-4">
          <q-btn
            flat
            no-caps
            :to="{ name: 'auth.register' }"
          >
            Create Account
          </q-btn>
          <q-btn
            flat
            no-caps
            :to="{ name: 'auth.login' }"
          >
            Login
          </q-btn>
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { reboot } from 'src/utils/proccessor';

defineOptions({
  async preFetch() {
    await reboot().then(({ init }) => {
      useBootstrapStore().configuration = init.configuration;
    });
  },
});
</script>
