# Explicit Environment Configuration

## Intent

Make deployment configuration deterministic across the Accountiva frontend and backend. Environment-specific behavior must come from explicit environment variables, never from branch names, hostnames, URL substrings, or production/UAT fallback guesses.

## Goals

- Introduce `APP_ENV=development|uat|production` as the explicit environment identity.
- Require the hosted frontend proxy to receive `API_PROXY_TARGET` and validate it as an HTTPS URL.
- Make the backend use `CLIENT_URL`, `BETTER_AUTH_URL`, and `DATABASE_URL` directly.
- Fail fast in hosted deployments when required configuration is missing or invalid.
- Add explicit local commands/modes so UAT env files are loaded only when intentionally selected.
- Preserve the existing production and UAT endpoints, auth flow, database behavior, and invoice-only feature gating when correctly configured.

## Non-goals

- Changing Netlify sites, domains, databases, credentials, or deployment branch policy.
- Combining the frontend and backend repositories.
- Adding a configuration dependency or secrets-management system.
- Changing product features or API behavior unrelated to configuration.

## Constraints

- Secrets remain external and are never committed or printed.
- Local development keeps localhost defaults only when `APP_ENV=development`.
- UAT and production receive no implicit URL defaults.
- Existing Netlify variables must be documented and updated before strict validation reaches a hosted deploy.
- Both React and Vue proxy copies that can be deployed must follow the same explicit configuration rule.

## Approaches Considered

1. **Strict direct variables — selected.** `APP_ENV` identifies the environment; endpoint and database variables provide their exact values; missing hosted configuration stops startup/request handling with a clear error.
2. **`APP_ENV` mapped to hardcoded URLs.** Fewer deployment variables, but URLs remain duplicated in source code and changing infrastructure requires a code release.
3. **Explicit variables with production fallbacks.** Less deployment risk initially, but a missing UAT variable could silently send traffic to production, which is the failure this change is intended to eliminate.

## Design

### Frontend

- Netlify API functions read only `API_PROXY_TARGET` for the upstream backend.
- The value must be an absolute HTTPS URL and one of the explicitly supported Accountiva API origins unless the tests establish a safer general validation rule.
- Remove request-hostname inspection and production/UAT fallback selection.
- Hosted browser code continues to call same-origin `/api` so authentication cookies remain first-party.
- Add explicit UAT build/dev commands using Vite's `--mode uat` where applicable.

### Backend

- Add a small configuration module that parses and validates `APP_ENV`.
- `development` may use localhost defaults; `uat` and `production` require explicit `CLIENT_URL` and `BETTER_AUTH_URL` values.
- Remove `isUatEnvironment` and every default chosen by searching configuration strings for `uat`.
- Database selection remains solely `DATABASE_URL`; no environment-to-database mapping is added.
- CORS/auth trusted origins continue to support configured origins, with static approved Accountiva origins retained only where needed for compatibility and security—not for environment detection.

### Verification

- Tests prove invalid/missing hosted configuration fails clearly.
- Tests prove frontend proxy selection uses only `API_PROXY_TARGET`.
- Tests prove UAT and production do not infer behavior from hostnames or branch names.
- Run the complete test and build commands in both repositories.

## Deployment Contract

Each Netlify site must explicitly set:

- Frontend: `APP_ENV`, `API_PROXY_TARGET`
- Backend: `APP_ENV`, `CLIENT_URL`, `BETTER_AUTH_URL`, `DATABASE_URL`, plus existing secrets

Production and UAT isolation remains the responsibility of distinct values scoped to their respective Netlify sites or deploy contexts.
