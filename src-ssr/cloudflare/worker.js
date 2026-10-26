/**
 * Cloudflare Workers entry for the SSR build.
 *
 * dist/ssr/index.js starts the Express server on PORT (3000 by default) when it loads,
 * and httpServerHandler hands each request to that server. It is loaded on the first
 * request because Workers don't allow random values or timers at startup.
 * Files in dist/ssr/client are served by the assets binding before the Worker runs.
 * Page requests over plain http are redirected to https.
 */
import { httpServerHandler } from 'cloudflare:node';

const handler = httpServerHandler({ port: Number(process.env.PORT || 3000) });

let server;

const localHosts = ['localhost', '127.0.0.1'];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.protocol === 'http:' && !localHosts.includes(url.hostname)) {
      url.protocol = 'https:';

      return Response.redirect(url.toString(), 301);
    }

    server ??= import('../../dist/ssr/index.js');
    await server;

    return handler.fetch(request, env, ctx);
  },
};
