# Accountiva UAT Publishing Workflow

These instructions are for any agentic AI or developer asked to publish completed Accountiva frontend work to UAT.

Use this workflow when the user says something like:

- "push this to uat"
- "deploy this to uat"
- "send my changes to uat"
- "publish everything I worked on to uat"

## Goal

Move the finished frontend work from the current working branch into the remote `uat` branch so Netlify can deploy the UAT frontend automatically.

Do not merge into `main`. The project owner will review UAT later and decide what goes to `main`.

## UAT Environment

- UAT branch: `uat`
- Production branch: `main`
- UAT frontend Netlify site: configured from the frontend `uat` branch
- UAT frontend URL: `https://www.uat.accountiva.ai` or `https://uat.accountiva.ai`
- UAT backend API URL: `https://uat-accountiva-api.netlify.app/api`

## Safety Rules

- Never run `git reset --hard`, `git checkout -- .`, or any destructive cleanup unless the user explicitly asks.
- Never push directly to `main` for a UAT publish request.
- Do not discard uncommitted files. If files are modified, assume they are user work.
- Do not print secrets from `.env`, `.env.uat`, Netlify, or API environment variables.
- If conflicts occur while merging into `uat`, stop and resolve them carefully. Do not guess on product behavior or UI.

## Before Publishing

1. Check the current branch and worktree:

   ```bash
   git status --short --branch
   ```

2. Review changed files:

   ```bash
   git diff --stat
   git diff --check
   ```

3. Run frontend validation:

   ```bash
   npx vue-tsc --noEmit
   npm run build
   ```

## Commit Current Work

If there are uncommitted changes that belong to the task, commit them on the current branch first:

```bash
git add <changed-files>
git commit -m "<short clear summary>"
```

Use a clear, plain commit message. Example:

```bash
git commit -m "Improve invoice list filters"
```

## Push Current Branch

Push the current feature branch so the work is backed up:

```bash
git push origin HEAD
```

If the current branch is already `uat`, push it directly after validation:

```bash
git push origin uat
```

## Merge Into UAT

If the current branch is not `uat`, update local `uat`, merge the feature branch, and push:

```bash
git fetch origin
git switch uat
git pull --ff-only origin uat
git merge --no-ff <source-branch-name>
git push origin uat
```

If `git pull --ff-only origin uat` fails because local `uat` has diverged, stop and inspect. Do not force push.

## UAT Environment Variables

For the frontend UAT Netlify site, confirm this server-side value is set:

```text
API_PROXY_TARGET=https://uat-accountiva-api.netlify.app
```

Hosted browser builds call `/api` on the frontend domain. Netlify's API proxy uses
`API_PROXY_TARGET` to reach the UAT backend without third-party auth cookies.
`VITE_API_URL` is only a fallback for local development and native builds.
Do not use production API URLs for UAT.

## After Pushing UAT

1. Tell the user the UAT branch was pushed.
2. Include the latest commit hash:

   ```bash
   git rev-parse --short HEAD
   ```

3. Tell the user to wait for the Netlify UAT deploy to finish.
4. Mention whether frontend validation passed.

## Final Response Template

Use this shape in the final message:

```text
Pushed frontend changes to UAT.

Branch: uat
Commit: <short-hash>
Validation: <typecheck/build result>

Netlify should redeploy the UAT frontend automatically.
```
