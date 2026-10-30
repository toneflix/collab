import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { NextFunction, Request, Response } from "express";

type Source = string | ((req: IncomingMessage, res: ServerResponse) => string);
type Directives = Record<string, Source[]>;

/**
 * Third-party hosts the app loads code, styles, fonts or frames from.
 */
const thirdParty = {
  scripts: [
    // Paystack checkout wallets
    "https://js.paystack.co",
    "https://applepay.cdn-apple.com",
    "https://pay.google.com",
    // Flutterwave Inline
    "https://checkout.flutterwave.com",
    // Firebase Realtime Database long-polling fallback
    "https://*.firebaseio.com",
    "https://*.firebasedatabase.app"
  ],
  // Web Audio Module plugins offered in the studio's effects menu
  plugins: ["https://www.webaudiomodules.com", "https://mainline.i3s.unice.fr"],
  styles: ["https://fonts.googleapis.com", "https://fonts.bunny.net"],
  fonts: ["https://fonts.gstatic.com", "https://fonts.bunny.net"],
  frames: [
    "https://checkout.paystack.com",
    "https://*.paystack.com",
    "https://*.paystack.co",
    "https://checkout.flutterwave.com",
    "https://*.flutterwave.com",
    "https://*.firebaseapp.com"
  ]
};

/**
 * The Content-Security-Policy for server-rendered pages.
 *
 * Scripts must come from this app, a known third party or carry the
 * per-request nonce that Quasar adds to its inline state and meta scripts.
 * Media, images and connections stay open to any https host because uploads
 * come from signed storage URLs and the realtime host is set by admins.
 */
export class ContentSecurityPolicy {
  private readonly apiOrigin: string | null;

  constructor(apiUrl: string) {
    this.apiOrigin = ContentSecurityPolicy.originOf(apiUrl);
  }

  /**
   * Gives each response a fresh nonce in res.locals.cspNonce.
   */
  nonceMiddleware() {
    return (_req: Request, res: Response, next: NextFunction) => {
      res.locals.cspNonce = randomBytes(16).toString("base64");
      next();
    };
  }

  /**
   * Helmet's contentSecurityPolicy option for this policy.
   */
  helmetOptions() {
    return {
      useDefaults: false,
      directives: this.directives()
    };
  }

  directives(): Directives {
    const api = this.apiOrigin ? [this.apiOrigin] : [];
    const insecureApi = this.apiOrigin?.startsWith("http:") ?? false;

    const nonce: Source = (_req, res) =>
      `'nonce-${(res as Response).locals.cspNonce}'`;

    const directives: Directives = {
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        nonce,
        // The MP3 encoder runs on WebAssembly
        "'wasm-unsafe-eval'",
        // Studio plugins load their audio worklets from blob: URLs
        "blob:",
        ...thirdParty.scripts,
        ...thirdParty.plugins
      ],
      "script-src-attr": ["'none'"],
      "style-src": ["'self'", "'unsafe-inline'", ...thirdParty.styles],
      "font-src": ["'self'", "data:", ...thirdParty.fonts],
      "img-src": ["'self'", "data:", "blob:", "https:", ...api],
      "media-src": ["'self'", "data:", "blob:", "https:", ...api],
      "connect-src": ["'self'", "https:", "wss:", ...api],
      "worker-src": ["'self'", "blob:"],
      "frame-src": thirdParty.frames,
      "manifest-src": ["'self'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'self'"]
    };

    if (insecureApi) {
      directives["connect-src"].push("ws:");
    } else {
      directives["upgrade-insecure-requests"] = [];
    }

    return directives;
  }

  private static originOf(url: string): string | null {
    try {
      return new URL(url).origin;
    } catch {
      return null;
    }
  }
}
