# Gathered Docs

VitePress documentation site for Gathered — the user-facing knowledge base.

This site documents **what the application does**, for organisers, guests and
administrators. Developer and operator documentation stays in the repository:
[`docs/DEPLOYMENT.md`](../../docs/DEPLOYMENT.md),
[`docs/BACKUP_RESTORE.md`](../../docs/BACKUP_RESTORE.md),
[`CONTRIBUTING.md`](../../CONTRIBUTING.md) and
[`specification/specification.md`](../../specification/specification.md).

## Coolify

Deploy from the monorepo with these settings:

- Base directory: `/apps/docs`
- Build/deploy type: Docker
- Dockerfile: `Dockerfile`
- Public service/port: port `8080`

The image is `nginxinc/nginx-unprivileged`, which runs as a non-root user and
listens on 8080. There is nothing to configure at runtime — the site is static.

## Local checks

```sh
npm ci
npm run docs:build
```

To work on it:

```sh
npm run docs:dev
```

## Before going live

- Replace `REPLACE_WITH_GATHERED_DOCS_WEBSITE_ID` in
  [`docs/.vitepress/config.mts`](./docs/.vitepress/config.mts) with the Umami
  website ID for this site, or remove the `head` script entirely.
- Confirm `support@gathered.app` on the home page is a mailbox that exists.

## Theme

The VitePress default theme, restyled with the application's own design tokens.
No components are replaced.

- [`docs/.vitepress/theme/palette.css`](./docs/.vitepress/theme/palette.css) —
  the tokens, **copied verbatim from
  [`src/app/globals.css`](../../src/app/globals.css)**. If a colour changes
  there, change it here. The application is light-only, so the dark values are
  this site's own, extended from the same warm ink family.
- [`docs/.vitepress/theme/custom.css`](./docs/.vitepress/theme/custom.css) —
  maps those tokens onto VitePress's variables, and sets type, radii and shape.

Fraunces and Inter, as in the application, both served from this site so no
request for a font leaves the reader's browser. Fraunces is in
`docs/public/fonts` — see [`FONTS.md`](./FONTS.md) for its source and licence.
Inter ships with the theme.

One deliberate divergence: `--g-butter-800` does not exist in the application.
Butter-700 on butter-50 — the app's `.notice-warning` pair — measures 4.22:1,
which is fine for a one-line notice but under AA for the multi-sentence warnings
here. Every text/background pair on the site otherwise clears AA in both modes.

## Screenshots

Images live in `docs/public/images/<section>/`. Seven are copied from
[`docs/screenshots/`](../../docs/screenshots) in the repository root, which are
generated from the fictional demo dataset:

```sh
npm run db:seed-demo            # from the repository root
node scripts/capture-screenshots.mjs
```

Pages that still need an image carry a `> 📷 **Screenshot needed:**` line naming
the path it should be saved to.
