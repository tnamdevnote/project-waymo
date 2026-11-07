# project-waymo

A 3D interactive prototype of passenger interaction on the cabin screen during a Waymo ride.

## Stack

- Next.js (App Router) · React · TypeScript
- HeroUI v3 on Tailwind CSS v4
- Oxlint and Oxfmt
- pnpm

## Getting started

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Scripts

| Script              | What it does                     |
| ------------------- | -------------------------------- |
| `pnpm dev`          | Start the dev server             |
| `pnpm build`        | Production build                 |
| `pnpm lint`         | Oxlint                           |
| `pnpm format`       | Format with Oxfmt                |
| `pnpm format:check` | Check formatting without writing |
| `pnpm typecheck`    | `tsc --noEmit`                   |
