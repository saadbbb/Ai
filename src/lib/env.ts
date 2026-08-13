/**
 * Falls back to Vercel's auto-provided env vars so this works with zero setup in production.
 *
 * `VERCEL_URL` is the *current deployment's own* unique hostname (a new random hash on every
 * deploy, e.g. `ai-j9nqtxqra-saadbbbs-projects.vercel.app`) — Vercel's Deployment Protection
 * (Vercel Authentication) gates that raw per-deployment URL by default, so any link built from
 * it bounces a real visitor to a vercel.com login/SSO page instead of the app. For a production
 * request, `VERCEL_PROJECT_PRODUCTION_URL` is the *stable* domain assigned to the project (what
 * users actually see in their browser, e.g. `ai-delta-navy-52.vercel.app`, or the project's
 * custom domain once one is attached) and is never protection-gated, so it's preferred whenever
 * present. `VERCEL_URL` remains the fallback for Preview deployments, where there is no stable
 * alias and the protection gate is expected.
 */
export function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
