import { Configuration, GenericData, PageData, PriviPerm, PriviRole, RealtimeSettings, SoundsConfig, User } from 'src/utils/models';
import { defineStore } from 'pinia';
import { AuthSession } from 'src/utils/auth-session';

export const useBootstrapStore = defineStore('bootstrap', {
  // The token lives in its cookie and the signed-in user comes from the server render,
  // so only settings are kept in browser storage.
  persist: { pick: ['configuration', 'realtime', 'sounds', 'app'] },
  state: () => ({
    user: <User>{},
    roles: <PriviRole[]>[],
    permissions: <PriviPerm[]>[],
    pageData: <PageData>{ current: {}, meta: {}, cache: {} },
    configuration: <Configuration>{},
    realtime: <RealtimeSettings>{ driver: 'none', authPath: 'realtime/auth', originHeader: 'X-Realtime-Origin' },
    /** Which sound sources the studio shows */
    sounds: <SoundsConfig>{ library: false, freesound: false },
    token: <string | null | undefined>null,
    ready: <boolean>false,
    initialized: <boolean>false,
    csrf_token: <string | null | undefined>null,
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
    setCache (data: GenericData[] | GenericData) {
      this.pageData.cache = data;
    },
    setReady () {
      this.ready = true;
    },
    saveAuthUser (user: User, token?: string | null) {
      this.user = user;
      this.token = token;
      if (token) {
        AuthSession.current().save(token);
      }
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
        // A server render can see an older copy of the cookie, so only the browser removes it
        if (!import.meta.env.SSR) {
          AuthSession.current().clear();
        }
        resolve(true);
      });
    },
    setConfig ({ configuration, realtime, sounds, csrf_token }: { configuration?: Configuration, realtime?: RealtimeSettings, sounds?: SoundsConfig, csrf_token?: string }) {
      if (configuration) {
        this.configuration = configuration;
      }

      if (realtime) {
        this.realtime = realtime;
      }

      if (sounds) {
        this.sounds = sounds;
      }

      if (csrf_token) {
        this.csrf_token = csrf_token;
      }
    },
  }
});
