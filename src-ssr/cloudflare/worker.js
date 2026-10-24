/**
 * Cloudflare Workers entry for the SSR build.
 *
 * dist/ssr/index.js starts the Express server on PORT (3000 by default) when it loads,
 * and httpServerHandler hands each request to that server. It is loaded on the first
 * request because Workers don't allow random values or timers at startup.
 * Files in dist/ssr/client are served by the assets binding before the Worker runs.
 */
import { httpServerHandler } from 'cloudflare:node';

const handler = httpServerHandler({ port: Number(process.env.PORT || 3000) });

let server;

export default {
  async fetch(request, env, ctx) {
    server ??= import('../../dist/ssr/index.js');
    await server;

    return handler.fetch(request, env, ctx);
  },
};
