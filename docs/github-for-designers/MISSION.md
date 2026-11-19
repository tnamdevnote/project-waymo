# Mission: GitHub workflow for designers on project-waymo

## Why

Designers on the team should be able to change the Waymo cabin prototype themselves (copy, spacing, tokens, motion) and land those changes safely, without asking an engineer to drive git for them.

## Success looks like

- Pull the latest `main`, start a branch, and run the prototype locally
- Commit a focused change and push the branch to GitHub
- Open a pull request with a clear description and a Vercel preview link
- Review someone else's PR: try the preview, leave line comments and suggestions, approve or request changes
- Squash-merge an approved PR and clean up the branch

## Constraints

- Audience is designers, many new to the terminal. Keep each lesson short, one win per lesson.
- Uses this repo's real setup: `main` default branch, pnpm, Vercel previews on PRs, no branch protection yet.

## Out of scope

- Rebasing, cherry-picking, resolving complex merge conflicts
- CI configuration, GitHub Actions, release management
