import { ResponseBody, User } from '../models';

import { alova } from 'src/boot/alova';
import { notify } from 'src/utils/helpers';

type CSParams = {
  id?: string | string[] | number,
  type: string,
  label: string,
  action?: 'report' | 'block' | 'unblock',
  method?: 'POST' | 'GET' | 'PUT',
}

type ReportResponse = ResponseBody<{
  id: string | number,
  user?: User,
  model?: unknown,
  type?: string,
  reason: string,
  user_id: string | number,
}>

export const requestFlagContent = (
  params: CSParams = {
    type: 'track',
    label: 'song',
    action: 'report',
    method: 'POST',
  },
  cb: ((p?: string) => void) = (state = 'pending') => state,
  requireConfirmation = true
) => {
  return new Promise((resolve, reject) => {
    typeof cb === 'function' && cb('pending');

    if (!requireConfirmation) {
      return contentSafety(params.action, params, cb, resolve, reject);
    }

    notify({
      alert: true,
      cancel: true,
      status: 'info',
      persistent: true,
      ok: `${params.action || 'report'} ${params.label}`.titleCase(),
      title:
        `${params.action || 'report'} ${params.label || 'post'}`.titleCase(),
      message: `Why are you ${params.action || 'report'}ing this ${params.label || 'content'}?`,
      options: {
        type: 'radio',
        model: '',
        isValid: (val: unknown) => !!val,
        items: [
          { label: 'Copyright Infringement', value: 'copyright' },
          { label: 'DMCA', value: 'dmca' },
          { label: 'Spam', value: 'spam' },
          { label: 'Abuse & Harassment', value: 'abuse' },
          { label: 'Violent Speech', value: 'violent' },
          { label: 'Suicide or self-harm', value: 'self-harm' },
          { label: 'Child Safety', value: 'child-safety' },
          { label: 'Privacy Concerns', value: 'privacy' },
          { label: 'Sensitive or disturbing media', value: 'sensitive' },
          { label: 'Hate', value: 'hate' },
        ],
      },
    })?.onOk((reason) => {
      contentSafety(reason, params, cb, resolve, reject)
    });
  });
};

export const contentSafety = (
  reason = '',
  params: CSParams = {
    type: 'track',
    label: 'song',
    action: 'report',
    method: 'POST',
  },
  cb: ((p?: string) => void) = (state = 'pending') => state,
  resolve: ((p?: unknown) => void) = () => null,
  reject: ((p?: unknown) => void) = () => null,
) => {
  typeof cb === 'function' && cb('loading');

  const endpoints = {
    report: 'safety/reports',
    block: 'safety/blocklist',
    unblock: `safety/blocklist/${params.id}`,
  };

  alova
    .Post<ReportResponse>(endpoints[params.action || 'report'], {
      id: params.id,
      type: params.type || 'feed',
      reason,
      _method: params.method,
    })
    .send()
    .then(({ status, message }) => {
      notify({
        status,
        alert: true,
        title:
          `${params.label || 'post'} ${params.action || 'report'}`.titleCase(),
        message: message,
      });
      typeof cb === 'function' && cb('done');
      resolve({ status, message });
    })
    .catch((error) => {
      typeof cb === 'function' && cb('error');
      notify(error.message, error.status)
      reject(error);
    });
};
