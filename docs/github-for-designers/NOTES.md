# Notes

- Requested by the repo owner as a guide for designers (not for the owner's own learning). Learners are designers joining the repo.
- Assumes learners have collaborator access to tnamdevnote/project-waymo (so they push branches, no forks), plus git, pnpm and the GitHub CLI (`gh`) installed and `gh auth login` done.
- Repo facts the lessons rely on (checked 2026-11-18): default branch `main`; no branch protection; squash/merge/rebase all enabled; "delete branch on merge" is off; Vercel bot posts a preview deployment on each PR.
- Team convention taught: branch names `design/<short-description>`, squash and merge, run `pnpm format && pnpm lint && pnpm typecheck` before pushing (from CLAUDE.md).
- Next lesson ideas: 0002 handling review feedback (pushing more commits, committing suggestions); 0003 when `git pull` reports a conflict.
