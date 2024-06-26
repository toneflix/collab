import { AxiosError, AxiosResponse } from 'axios';
import { Method, createAlova, invalidateCache, useRequest } from 'alova';

import { Cookies } from 'quasar'
import { GenericResponse } from 'src/utils/models';
import GlobalFetch from 'alova/GlobalFetch';
import { Ref } from 'vue';
import { RouteLocationNormalized } from 'vue-router';
import VueHook from 'alova/vue';
import { axiosRequestAdapter } from '@alova/adapter-axios';
import { boot } from 'quasar/wrappers';
import { notify } from 'src/utils/helpers';
import { readEnv } from 'src/utils/proccessor';
import { useBootstrapStore } from 'src/stores/bootstrap-store';

// declare module '@vue/runtime-core' {
//   interface ComponentCustomProperties {
//     // $axios: ResponseMethod;
//     // $api: AxiosInstance; 906 569 8152
//   }
// }

const baseURL = readEnv('baseURL');

/* eslint-disable @typescript-eslint/no-explicit-any */
type ResponseMethod = Method<Ref<unknown>, Ref<unknown>, any, any, RequestInit, Response, Headers>
function isAxios (useAxios: boolean, response: AxiosResponse | Response): response is AxiosResponse {
  return useAxios === true;
}

/**
 *
 */
const responded = async (
  response: AxiosResponse | Response,
  method: ResponseMethod,
  useAxios: boolean = false
) => {
  const boot = useBootstrapStore();

  const json = isAxios(useAxios, response)
    ? await response.data
    : await response.json();

  return new Promise((resolve, reject) => {
    if (typeof json.response !== 'undefined' && !json.data) {
      json.data = json.response;
      if (Array.isArray(json.data) && json.data.length === 0) {
        json.data = {};
      }
      delete json.response;
    }

    if (response.status === 401) {
      boot.clearAuth().then(() => {
        boot.redirectTo({ name: 'auth.login' } as RouteLocationNormalized);
      });
      reject(json);
    } else if (response.status >= 400) {
      const message = (json.message || response.statusText || 'Unknown error') as string;
      if (![422, 401, 403].includes(response.status)) {
        notify(message, json.status || 'error');
      }

      if (json.errors) {
        json.errors = Object.assign(
          {},
          ...Object.keys(json.errors).map((e) => {
            return {
              [e]: Array.isArray(json.errors[e])
                ? json.errors[e][0]
                : json.errors[e],
            };
          }),
        );
      }
      reject(json);
    } else {
      if (json.token || json.data?.token) {
        boot.token = json.token || json.data.token;
        if (boot.token) {
          Cookies.set('token', boot.token)
        }
        method.config.headers.Authorization = 'Bearer ' + boot.token;
      }
      resolve(json);
    }
  });
};
// 1. Create an alova instance
const alova = createAlova({
  baseURL,
  responded,
  statesHook: VueHook,
  requestAdapter: GlobalFetch(),
});

// 2. Create an alova instance for axios
const axios = createAlova({
  baseURL,
  statesHook: VueHook,
  requestAdapter: axiosRequestAdapter(),
  responded: {
    onSuccess (
      response: AxiosResponse,
      method

    ) {
      return responded(response, method as unknown as ResponseMethod, true);
    },
    /**
     *
     */
    onError (err: AxiosError) {
      const boot = useBootstrapStore();
      const response = err.response as unknown as GenericResponse<Record<string, string | number>>;
      if (!response) {
        return;
      }

      if (response.status === 401) {
        boot.clearAuth().then(() => {
          boot.redirectTo({ name: 'auth.login' } as RouteLocationNormalized);
        });
      } else if (response.status >= 400) {
        const message =
          response.data.message || response.statusText || 'Unknown error';
        if (![422, 401, 403].includes(response.status)) {
          notify(message, response.data.status || 'error');
        }
      }
      if (response.data?.errors) {
        response.data.errors = Object.assign(
          {},
          ...Object.keys(response.data.errors).map((e) => {
            return {
              [e]: Array.isArray(response.data.errors?.[e])
                ? response.data.errors[e][0]
                : response.data.errors?.[e],
            };
          }),
        );
      }

      return new Promise((resolve, reject) => {
        reject(response.data);
      });
    },
  },
});

export default boot(async ({ app, router, ssrContext }) => {
  const boot = useBootstrapStore();
  const cookies = import.meta.env.SSR
    ? Cookies.parseSSR(ssrContext)
    : Cookies

  boot.$subscribe((e, store) => {
    if (store.token && !cookies.has('token')) {
      cookies.set('token', store.token)
    } else if (!store.token) {
      cookies.remove('token')
    }
  })

  const beforeRequest = (method: ResponseMethod, withCredentials?: boolean) => {
    // Set headers
    method.config.headers = {
      ...method.config.headers,
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json',
      'Access-Control-Allow-Credentials': 'true',
    };

    if (withCredentials) {
      method.config.headers.withCredentials = 'true'
    }

    if (
      !method.meta?.noContentType &&
      method.config.headers['Content-Type'] !== 'multipart/form-data'
    ) {
      method.config.headers['Content-Type'] = 'application/json; charset=utf-8';
    }

    if (cookies.get('token')) {
      boot.token = cookies.get('token')
    }

    // Check valid token and Set header
    if (boot.token && !method.meta?.noAuth) {
      method.config.headers.Authorization = 'Bearer ' + boot.token;
    }
  }

  alova.options.beforeRequest = (method) => beforeRequest(method)
  axios.options.beforeRequest = (method) => beforeRequest(method as unknown as ResponseMethod, true)
  app.config.globalProperties.$alova = alova;

  router.beforeResolve(async (to) => {
    if (
      boot.redirect &&
      to.name !== boot.redirect.name
    ) {
      router.replace(boot.redirect);
      boot.redirect = null;
    }
  });
});

export { alova, axios, useRequest, invalidateCache };
