<!--
Your PR title becomes the commit message and the changelog entry, because this
repository squash-merges. Use a conventional commit:

  feat(rsvp): let guests change their answer before the deadline
  fix(exports): escape quotes in the CSV guest name column

CI rejects titles that don't match. See CONTRIBUTING.md.
-->

## What this changes

<!-- One or two sentences. What is different after this merges? -->

## Why

<!--
Link the issue: "Closes #123".

If there is no issue, say what problem this solves. Behaviour changes are
expected to trace back to specification/specification.md — quote the section, or
say explicitly that this changes the specification and why.
-->

## How to check it

<!-- The steps a reviewer runs to see it working, including any setup. -->

## Checklist

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes against a real test database
- [ ] Schema changes come with a generated migration (`npm run db:generate`)
- [ ] New behaviour has a test; fixed bugs have a test that failed before
- [ ] Guest personal data is not newly exposed to superadmins, logs, or exports
- [ ] Docs updated if setup, configuration or deployment changed
- [ ] This does not add anything from the "Deliberately not built" list in the
      README without a decision recorded in the issue

## Anything reviewers should push back on

<!--
Optional but useful. Trade-offs you took, things you were unsure about, parts
you'd like a second opinion on.
-->
