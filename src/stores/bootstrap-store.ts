import { Configuration, PageData, PriviPerm, PriviRole, User } from 'src/utils/models';
import { defineStore } from 'pinia';
import { RouteLocationNormalized } from 'vue-router';

export const useBootstrapStore = defineStore('bootstrap', {
  persist: true,
  state: () => ({
    user: <User>{},
    roles: <PriviRole[]>[],
    permissions: <PriviPerm[]>[],
    pageData: <PageData>{ current: {} },
    configuration: <Configuration>{},
    token: <string | null | undefined>null,
    ready: <boolean>false,
    initialized: <boolean>false,
    csrf_token: <string | null | undefined>null,
    redirect: <RouteLocationNormalized | null>null,
    app: {
      super: <boolean>false,
      cache: {
        reg_form: {},
        componentPaths: {},
      },
    },
  }),

  getters: {
    getCache (state) {
      return state.pageData.cache;
    }
  },

  actions: {
    setUser (user: User) {
      this.user = user;
    },
    setCache (data: Record<string, string>) {
      this.pageData.cache = data;
    },
    setReady () {
      this.ready = true;
    },
    redirectTo (route: RouteLocationNormalized) {
      this.redirect = route;
    },
    saveAuthUser (user: User, token?: string | null) {
      this.user = user;
      this.token = token;
      if (user.permissions) {
        this.permissions = user.permissions;
      }
      if (user.roles) {
        this.roles = user.roles;
      }
    },
    setInitialized () {
      this.initialized = true;
    },
    clearAuth () {
      return new Promise<boolean>((resolve) => {
        this.user = {} as User;
        this.token = null;
        this.roles = [];
        this.permissions = [];
        resolve(true);
      });
    },
    setConfig ({ configuration, csrf_token }: { configuration?: Configuration, csrf_token?: string }) {
      if (configuration) {
        this.configuration = configuration;
      }

      if (csrf_token) {
        this.csrf_token = csrf_token;
      }
    },
  }
});
