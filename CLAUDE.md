@AGENTS.md

# project-waymo

3D interactive prototype of passenger interaction on a Waymo cabin screen. Next.js App Router, React, TypeScript, HeroUI v3, Tailwind v4, pnpm.

## Commands

- `pnpm dev`, `pnpm build`
- `pnpm lint` (Oxlint), `pnpm format` (Oxfmt), `pnpm typecheck`
- Run `pnpm format && pnpm lint && pnpm typecheck` before calling work done.

## Notes

- HeroUI v3 uses compound components (`Card.Header`, `Card.Content`) and `onPress`, not `onClick`. No provider needed. Styles come from `@import "@heroui/styles"` in `src/app/globals.css`.
