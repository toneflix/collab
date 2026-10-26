import { Cookies } from 'quasar';
import { requestContext } from 'src/utils/request-context';

type CookieJar = Pick<typeof Cookies, 'get' | 'set' | 'remove'>;

/**
 * The signed-in token, kept in one cookie at the site root so the server
 * render and the browser read the same value.
 */
export class AuthSession {
  static readonly cookie = 'token';

  /** Days the cookie lasts; each visit renews it. */
  static readonly days = 30;

  constructor (protected cookies: CookieJar, protected secure = false) {}

  /**
   * The session of the current render on the server, or of the browser.
   */
  static current (): AuthSession {
    if (import.meta.env.SSR) {
      const context = requestContext();

      return new AuthSession(
        context ? Cookies.parseSSR(context) : { get: () => null, set: () => undefined, remove: () => undefined } as unknown as CookieJar,
      );
    }

    return new AuthSession(Cookies, window.location.protocol === 'https:');
  }

  get token (): string | null {
    return this.cookies.get(AuthSession.cookie) || null;
  }

  save (token: string) {
    this.removeNestedCopies();
    this.cookies.set(AuthSession.cookie, token, {
      path: '/',
      expires: AuthSession.days,
      sameSite: 'Lax',
      secure: this.secure,
    });
  }

  /**
   * Drops copies stuck on other paths, then renews the root cookie.
   */
  refresh () {
    this.removeNestedCopies();

    const token = this.token;

    if (token) {
      this.save(token);
    }
  }

  clear () {
    this.removeNestedCopies();
    this.cookies.remove(AuthSession.cookie, { path: '/' });
  }

  /**
   * Older builds set the cookie without a path, so browsers tied a copy to
   * whichever folder the page was in. Those copies shadow the root cookie there.
   */
  protected removeNestedCopies () {
    if (import.meta.env.SSR) {
      return;
    }

    const parts = window.location.pathname.split('/').filter(Boolean);

    for (let i = parts.length; i > 0; i--) {
      const path = '/' + parts.slice(0, i).join('/');

      this.cookies.remove(AuthSession.cookie, { path });
      this.cookies.remove(AuthSession.cookie, { path: path + '/' });
    }
  }
}
