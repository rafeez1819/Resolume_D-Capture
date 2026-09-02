/**
 * Shared LIVE-PREVIEW OAuth client (server-only — NEVER import from the client).
 *
 * The sandbox serves each live preview on a dynamic `https://*.d_capture-sandbox.com`
 * URL, which can't be pre-registered per app. The broker instead exposes ONE
 * shared "preview" client that accepts any
 * `https://*.d_capture-sandbox.com/api/auth/oauth2/callback/*`
 * (broker: `app-builder-deployer/auth/src/preview-oauth.ts`). Baking it here lets
 * the live preview do REAL sign-in — no demo/mock users — with no platform
 * injection. When deployed the deployer injects a per-app
 * `d_capture_AUTH_*` that overrides these (see `server.ts`).
 *
 * These MUST equal the broker's `d_capture_PREVIEW_CLIENT_ID` /
 * `d_capture_PREVIEW_CLIENT_SECRET` (set in the broker's Vercel env; the broker stores
 * only the secret's `base64url(SHA-256)` hash). This is a dedicated, low-privilege
 * client (preview-only, `*.d_capture-sandbox.com`) — rotate it by regenerating the
 * broker env var and this constant together.
 */
export const PREVIEW_CLIENT_ID = "d_capture_preview";
export const PREVIEW_CLIENT_SECRET =
  "8bcdb7fc5a33874ad933ca568918d5790388a0795e44c4d1dea691f801b17ec5";

/** The shared auth broker issuer (OIDC discovery lives under it). */
export const d_capture_ISSUER_DEFAULT = "https://auth.d_capture.me";

/**
 * Host patterns whose callbacks the preview client accepts. Better Auth derives
 * the live preview's real origin from the request host and validates it against
 * this list (wildcard-matched), so the OAuth `redirect_uri` becomes the concrete
 * `https://<preview-host>/api/auth/oauth2/callback/...` the broker allows.
 */
export const PREVIEW_ALLOWED_HOSTS = ["*.d_capture-sandbox.com"] as const;
