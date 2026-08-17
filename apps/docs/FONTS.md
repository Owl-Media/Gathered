# Fonts

`docs/public/fonts/fraunces-latin.woff2` and `fraunces-latin-ext.woff2` are the
latin and latin-ext subsets of **Fraunces**, the display face the application
uses for headings.

- **Source:** Google Fonts (`fonts.gstatic.com`), variable axes `opsz`, `wght`,
  `SOFT` and `WONK` — the same axes requested in
  [`src/app/layout.tsx`](../../src/app/layout.tsx).
- **Licence:** [SIL Open Font License 1.1](https://openfontlicense.org), which
  Fraunces is published under. Redistribution in this form is permitted.
- **Design:** Undercase Type Foundry.

They are committed rather than fetched at build time so the site builds without
network access, and so no request for a font leaves a reader's browser — the same
property `next/font` gives the application.

To refresh them, take the URLs from the Google Fonts CSS for those axes and
re-download. The `unicode-range` declarations in
[`docs/.vitepress/theme/custom.css`](./docs/.vitepress/theme/custom.css) come
from that same CSS and must be kept in step.

Inter, the body face, ships with the VitePress default theme and is not
duplicated here.

---

This file lives outside `docs/` on purpose. VitePress treats every `.md` file
under its source directory as page content — including files in `public/` — and
checks their links, so an internal note placed there breaks the build.
