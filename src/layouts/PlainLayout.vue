<template>
  <q-layout view="hHh lpR fFf">
    <q-header reveal class="text-white bg-dark" v-if="!$route.meta.hideHeader">
      <q-toolbar class="py-3 bg-dark">
        <q-toolbar-title>
          <div>
            <img src="~/assets/logo.png" class="h-10 cursor-pointer" />
          </div>
        </q-toolbar-title>
        <q-space />
        <div class="flex gap-4">
          <VaButton
            preset="plain"
            color="textPrimary"
            tag="a"
            :to="{ name: 'auth.register' }"
          >
            Create Account
          </VaButton>
          <VaButton
            preset="plain"
            color="textPrimary"
            tag="a"
            :to="{ name: 'auth.login' }"
          >
            Login
          </VaButton>
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
