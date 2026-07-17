import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseToml } from "smol-toml";
import { describe, expect, test } from "vitest";

const ROOT = process.cwd();
const theme = parseToml(readFileSync(join(ROOT, "src/content/theme.toml"), "utf8"));
const DARK_LIME = "#2f3b07";

function parseHex(value) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value);
  if (!match) throw new Error(`Unsupported color: ${value}`);
  return match.slice(1).map((channel) => Number.parseInt(channel, 16) / 255);
}

function resolveColor(value) {
  if (value.startsWith("#")) return parseHex(value);

  const match = /^color-mix\(in srgb, (#[\da-f]{6}) (\d+)%, (#[\da-f]{6})\)$/i.exec(value);
  if (!match) throw new Error(`Unsupported color expression: ${value}`);

  const weight = Number(match[2]) / 100;
  const first = parseHex(match[1]);
  const second = parseHex(match[3]);
  return first.map((channel, index) => channel * weight + second[index] * (1 - weight));
}

function relativeLuminance(value) {
  const linear = resolveColor(value).map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function darkBackgrounds() {
  return [
    ["dark paper", theme.dark.bg],
    ["dark lime field", DARK_LIME],
  ];
}

describe("dark theme contrast", () => {
  test.each([
    "text",
    "text-muted",
    "text-meta",
    "text-faint",
  ])("%s reaches 4.5:1 over both background endpoints", (role) => {
    for (const [, background] of darkBackgrounds()) {
      expect(contrastRatio(theme.dark[role], background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test.each([
    "line",
    "line-strong",
    "focus",
    "accent-alt",
  ])("%s reaches 3:1 over both background endpoints", (role) => {
    for (const [, background] of darkBackgrounds()) {
      expect(contrastRatio(theme.dark[role], background)).toBeGreaterThanOrEqual(3);
    }
  });

  test("filled blue controls keep readable light text", () => {
    expect(
      contrastRatio(theme.dark["on-accent"], theme.dark["accent-fill"]),
    ).toBeGreaterThanOrEqual(4.5);
  });

  test.each([
    "msg-info-tx",
    "msg-tip-tx",
    "msg-warn-tx",
    "msg-note-tx",
    "msg-danger-tx",
  ])("%s reaches 4.5:1 over both background endpoints", (role) => {
    for (const [, background] of darkBackgrounds()) {
      expect(contrastRatio(theme.dark[role], background)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("dark gradient endpoint mapping", () => {
  test("keeps the light composition: light paper maps to dark paper, light lime to the dark lime field", () => {
    const appSource = readFileSync(join(ROOT, "src/app.jsx"), "utf8");
    const filter = appSource.match(/<filter id="gg-dark-map"[\s\S]*?values="([^"]+)"/);
    expect(filter).not.toBeNull();

    const matrix = filter[1].trim().split(/\s+/).map(Number);
    expect(matrix).toHaveLength(20);

    const mapBlue = (blue) =>
      [0, 1, 2].map((row) => {
        const offset = row * 5;
        return Math.round(255 * (matrix[offset + 2] * (blue / 255) + matrix[offset + 4]));
      });
    const toHex = (rgb) =>
      `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;

    expect(toHex(mapBlue(247))).toBe(theme.dark.bg);
    expect(toHex(mapBlue(10))).toBe(DARK_LIME);
  });
});
