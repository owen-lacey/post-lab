import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Guards a post-lab server bound to 127.0.0.1 (R29). Requests must name post-lab's own host
 * (blocks DNS rebinding), state-changing requests must come from post-lab's own origin (blocks
 * cross-site requests), and /api calls need the session cookie, obtained once per launch by
 * swapping the launch token.
 */
export function createSecurity(publicPort: number) {
  const hosts = new Set([`127.0.0.1:${String(publicPort)}`, `localhost:${String(publicPort)}`]);
  const origins = new Set([...hosts].map((host) => `http://${host}`));
  // Cookies are not port-scoped, so the name carries the port.
  const cookieName = `post-lab-session-${String(publicPort)}`;
  const session = randomToken();
  let launchToken: string | undefined = randomToken();

  const signInUrl = `http://127.0.0.1:${String(publicPort)}/api/session?token=${launchToken}`;

  const originGuard: MiddlewareHandler = async (c, next) => {
    if (!hosts.has(c.req.header('host') ?? '')) {
      return c.text('Forbidden host', 403);
    }
    if (!SAFE_METHODS.has(c.req.method) && !origins.has(c.req.header('origin') ?? '')) {
      return c.text('Forbidden origin', 403);
    }
    await next();
  };

  const sessionGuard: MiddlewareHandler = async (c, next) => {
    if (!safeEqual(getCookie(c, cookieName) ?? '', session)) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    await next();
  };

  const signIn = (c: Context) => {
    if (launchToken === undefined || !safeEqual(c.req.query('token') ?? '', launchToken)) {
      return c.text(
        'This sign-in link is invalid or already used. Restart post-lab for a new one.',
        401,
      );
    }
    launchToken = undefined;
    setCookie(c, cookieName, session, { httpOnly: true, sameSite: 'Strict', path: '/' });
    return c.redirect('/');
  };

  return { signInUrl, originGuard, sessionGuard, signIn };
}
