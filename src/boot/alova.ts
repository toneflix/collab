import { AxiosError, AxiosResponse } from 'axios';
import { type Method, createAlova, invalidateCache } from 'alova';
import { useRequest } from 'alova/client';

import { GenericResponse } from 'src/utils/models';
import adapterFetch from 'alova/fetch';
import { Router } from 'vue-router';
import VueHook from 'alova/vue';
import { axiosRequestAdapter } from '@alova/adapter-axios';
import { defineBoot } from '#q-app';
import { notify } from 'src/utils/helpers';
import { apiUrl } from 'src/utils/env';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { realtimeOrigin } from 'src/utils/realtime';
import { AuthSession } from 'src/utils/auth-session';
import { requestPinia } from 'src/utils/request-context';

const baseURL = apiUrl;

/** Requests give up after this long, so a stuck API call can't hold a page change forever. */
const timeout = 30000;

/** The browser's router, set once the app boots there. */
let clientRouter: Router | undefined;

/* eslint-disable @typescript-eslint/no-explicit-any */
type ResponseMethod = Method<any>
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isAxios (useAxios: boolean, response: AxiosResponse | Response): response is AxiosResponse {
  return useAxios === true;
}

/**
 * The API turned down the token a request carried: forget it, and leave pages
 * that need an account for the login page.
 */
const signedOut = (method: ResponseMethod) => {
  const boot = useBootstrapStore(requestPinia());
  const sentToken = !!(method.config.headers as Record<string, string> | undefined)?.Authorization;

  if (!sentToken || method.meta?.ignoreUnauthorized) {
    return;
  }

  void boot.clearAuth();

  const route = clientRouter?.currentRoute.value;

  if (route && (route.meta.requireAuth || route.meta.requireAdmin) && route.name !== 'auth.logout') {
    void clientRouter?.replace({ name: 'auth.login', query: { redirect: route.fullPath } });
  }
};

const responded = async (
  response: AxiosResponse | Response,
  method: ResponseMethod,
  useAxios: boolean = false
) => {
  const boot = useBootstrapStore(requestPinia());

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
      signedOut(method);
      reject(json);
    } else if (response.status >= 400) {
      const message = (json.message || response.statusText || 'Unknown error') as string;
      if (![422, 401, 403].includes(response.status)) {
        notify(message, json.status || 'error');
      }

      if (response.status === 404) {
        boot.pageData.current = {}
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
      const token = json.token || json.data?.token;

      if (token) {
        boot.token = token;
        AuthSession.current().save(token);
      }
      resolve(json);
    }
  });
};
// 1. Create an alova instance
const alova = createAlova({
  baseURL,
  timeout,
  responded,
  statesHook: VueHook,
  requestAdapter: adapterFetch(),
});

// 2. Create an alova instance for axios
const axios = createAlova({
  baseURL,
  timeout,
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
    onError (err: AxiosError, method) {
      const boot = useBootstrapStore(requestPinia());
      const response = err.response as unknown as GenericResponse<Record<string, string | number>>;
      if (!response) {
        return;
      }

      if (response.status === 401) {
        signedOut(method as unknown as ResponseMethod);
      } else if (response.status >= 400) {
        const message =
          response.data.message || response.statusText || 'Unknown error';
        if (![422, 401, 403].includes(response.status)) {
          notify(message, response.data.status || 'error');
        }

        if (response.status === 404) {
          boot.pageData.current = {}
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

export default defineBoot(({ app, router }) => {
  const beforeRequest = (method: ResponseMethod, withCredentials?: boolean) => {
    // Read the store and cookie of this request, which on the server may run beside others
    const boot = useBootstrapStore(requestPinia());
    const token = AuthSession.current().token;

    method.config.headers = {
      ...method.config.headers,
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json',
      'Access-Control-Allow-Credentials': 'true',
      // Lets this tab recognise, and skip, realtime events it caused.
      [boot.realtime?.originHeader || 'X-Realtime-Origin']: realtimeOrigin,
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

    boot.token = token;

    if (token && !method.meta?.noAuth) {
      method.config.headers.Authorization = 'Bearer ' + token;
    }
  }

  alova.options.beforeRequest = (method) => beforeRequest(method)
  axios.options.beforeRequest = (method) => beforeRequest(method as unknown as ResponseMethod, true)
  app.config.globalProperties.$alova = alova;

  if (!import.meta.env.SSR) {
    clientRouter = router;
  }
});

export { alova, axios, useRequest, invalidateCache };
