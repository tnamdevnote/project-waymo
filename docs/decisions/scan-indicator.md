# Scan indicator pattern: decided from /proto/scan-patterns

Date: 2026-11-12. `ScanIndicator` (`src/components/ui/ScanIndicator.tsx`) is the processing indicator shown while the car scans its surroundings. It wraps the img-fx pixel-mosaic shader.

## Picked: Grid

Rigid, machine-like motion on a coarse grid, like a low-resolution occupancy map. Blocky enough to read at arm's length from the back seat.

- Preset: `pixels-mechanic`
- Cell size: `pixelScale` 2 (cells twice the preset's size)
- Palette: unchanged from before the exploration. Slots that match the card are `--surface`; the rest ramp from 30% to 100% `--accent`, mixed in OKLCH with `--surface`.
- Needs `patches/img-fx@0.5.1.patch` (premultiplied alpha and hue-preserving highlights). Without it, light mode turns grey and cyan.

## Rejected

- **Flow** (`pixels-organic`, default cell size; the first version): calm, but it read as generic loading rather than scanning.
- **Sweep** (`sweep-gradient`, cells at 0.6×): the most literal "sensor pass", but the most motion in the rider's peripheral view, and the fine grid reads as texture from the back seat.
- **Detect** (sparse solid accent blocks, no gradient field): cut before review. Light presets keep their contrast near the card colour and boost highlights about 3×, so the blocks either vanished or washed out to pale blue. Getting this look would take more shader patches, not palette changes.
