# CLAUDE.md

**Read [`AGENTS.md`](./AGENTS.md) first.** It is the canonical brief for this
repository: commands, layout, the seven invariants that must not be broken, code
conventions, database workflow, and the out-of-scope list. Everything there
applies. This file only adds what is specific to Claude Code.

---

## Preview and verification

`.claude/launch.json` defines a `gathered-dev` configuration on port 3000. Use
`preview_start` with `{ name: "gathered-dev" }` rather than running `npm run
dev` through Bash — the dev server belongs in the Browser pane so it can be
inspected and screenshotted.

After a UI change, verify it rather than asking the user to look:

1. `preview_start { name: "gathered-dev" }`
2. `read_console_messages` and `preview_logs` for errors
3. `read_page` to confirm structure and copy
4. `computer` / `form_input` to drive the flow, then `read_page` again
5. `computer { action: "screenshot" }` to show the result

To reach a guest RSVP page you need a private link, and there is no way to guess
one. Two ways to get one: run `npm run db:seed-demo`, which prints a link for
each of its eight fictional guests, or, for an event you created yourself, read
it out of `preview_logs` — with `EMAIL_DRIVER=console` the invitation email is
printed to the dev server output with the link in it.

Skip all of this for changes the browser cannot exercise: types, tests, exports,
migrations, CI config.

---

## Scope discipline

This codebase rewards small diffs. Two habits matter more than usual here:

- **Do not refactor adjacent code you happened to read.** The explanatory
  comments and the slightly repetitive query helpers are deliberate.
- **Do not add a feature the task did not ask for**, especially anything on the
  out-of-scope list in `AGENTS.md`. Several obvious-looking omissions are
  decisions.

If the task conflicts with `specification/specification.md` or with one of the
invariants, say so in your response and stop, rather than picking an
interpretation.

---

## Searching the specification

`specification/specification.md` is around 50KB with numbered sections
(`## 8.2 Guest Privacy Rules`). Grep for the section number or heading rather
than reading the whole file — code comments cite sections as "Spec 8.2", and
those citations are accurate.

---

## Before reporting done

```bash
npm run typecheck
npm test
```

`npm test` needs a real PostgreSQL test database (setup in `AGENTS.md`). If it
is not available, say the suite did not run — do not describe a change as
verified when only the typecheck passed.
