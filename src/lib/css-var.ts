// WebGL materials take sRGB. Theme tokens are oklch() and var(), so sample the used color.
export function cssVar(name: `--${string}`): string {
  return cssColor(`var(${name})`);
}

/** Resolve any CSS color expression built from tokens (e.g. a color-mix of two vars) to sRGB hex. */
export function cssColor(value: string): string {
  if (typeof document === "undefined") return "#ffffff";
  const probe = document.createElement("span");
  probe.style.color = value;
  document.documentElement.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const sample = canvas.getContext("2d");
  if (!sample) return "#ffffff";
  sample.fillStyle = computed;
  sample.fillRect(0, 0, 1, 1);
  const [r, g, b] = sample.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
