import type { MiddlewareHandler } from 'hono';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Guards a post-lab server bound to 127.0.0.1 against other web pages in the user's browser
 * (R29). Requests must name post-lab's own host, which blocks DNS rebinding, and state-changing
 * requests must come from post-lab's own origin, which blocks cross-site requests. GET routes
 * must stay free of side effects, since browsers let any page send them (but not read the reply).
 */
export function originGuard(publicPort: number): MiddlewareHandler {
  const hosts = new Set([`127.0.0.1:${String(publicPort)}`, `localhost:${String(publicPort)}`]);
  const origins = new Set([...hosts].map((host) => `http://${host}`));

  return async (c, next) => {
    if (!hosts.has(c.req.header('host') ?? '')) {
      return c.text('Forbidden host', 403);
    }
    if (!SAFE_METHODS.has(c.req.method) && !origins.has(c.req.header('origin') ?? '')) {
      return c.text('Forbidden origin', 403);
    }
    await next();
  };
}
