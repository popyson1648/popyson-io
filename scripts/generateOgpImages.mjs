import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import satori from "satori";
import sharp from "sharp";
import { createElement } from "react";

import { articleOgpPath } from "../src/ogp.js";

export const OGP_WIDTH = 1200;
export const OGP_HEIGHT = 630;
export const MAX_TITLE_SIZE = 74;
export const MIN_TITLE_SIZE = 24;
export const TITLE_SAFE_WIDTH = 1041;
export const TITLE_SAFE_HEIGHT = 270;

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const FONT_DIR = join(ROOT, "src/assets/fonts");
const AVATAR_FILE = join(ROOT, "public/avator.jpg");
const ALEXANDRIA_600_FILE = fileURLToPath(
  import.meta.resolve("@fontsource/alexandria/files/alexandria-latin-600-normal.woff"),
);
const ALEXANDRIA_700_FILE = fileURLToPath(
  import.meta.resolve("@fontsource/alexandria/files/alexandria-latin-700-normal.woff"),
);
const BUBBLE_LEFT = 46;
const BUBBLE_TOP = 48;
const BUBBLE_WIDTH = 1100;
const BUBBLE_HEIGHT = 327;
const TITLE_LINE_HEIGHT = 1.15;

let assetsPromise;
let baseCardPromise;

function element(type, props = {}, ...children) {
  return createElement(type, props, ...children.flat());
}

async function loadAssets() {
  assetsPromise ??= Promise.all([
    readFile(join(FONT_DIR, "LINESeedJP-Bold.ttf")),
    readFile(ALEXANDRIA_600_FILE),
    readFile(ALEXANDRIA_700_FILE),
    readFile(AVATAR_FILE),
  ]).then(([lineSeedJpBold, alexandria600, alexandria700, avatar]) => ({
    fonts: [
      { name: "LINE Seed JP", data: lineSeedJpBold, weight: 700, style: "normal" },
      { name: "Alexandria", data: alexandria600, weight: 600, style: "normal" },
      { name: "Alexandria", data: alexandria700, weight: 700, style: "normal" },
    ],
    avatarDataUrl: `data:image/jpeg;base64,${avatar.toString("base64")}`,
  }));
  return assetsPromise;
}

function titleStyle(fontSize) {
  return {
    display: "flex",
    width: TITLE_SAFE_WIDTH,
    color: "#404040",
    fontFamily: "Alexandria, LINE Seed JP",
    fontSize,
    fontWeight: 700,
    lineHeight: TITLE_LINE_HEIGHT,
    wordBreak: "break-word",
  };
}

function localeTag(lang) {
  return lang === "en" ? "en-US" : "ja-JP";
}

async function titlePng(title, fontSize, fonts, lang) {
  const svg = await satori(
    element(
      "div",
      {
        lang: localeTag(lang),
        style: {
          display: "flex",
          width: TITLE_SAFE_WIDTH,
          height: 1000,
          alignItems: "flex-start",
          backgroundColor: "transparent",
        },
      },
      element("div", { style: titleStyle(fontSize) }, title),
    ),
    { width: TITLE_SAFE_WIDTH, height: 1000, fonts },
  );
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function renderTitleBlock(title, fontSize, fonts, lang) {
  const fullPng = await titlePng(title, fontSize, fonts, lang);
  const { data, info } = await sharp(fullPng).trim().png().toBuffer({ resolveWithObject: true });
  return { png: data, width: info.width, height: info.height, fontSize };
}

function titleFits(block) {
  return block.width <= TITLE_SAFE_WIDTH && block.height <= TITLE_SAFE_HEIGHT;
}

export async function layoutTitle(title, lang = "ja") {
  const { fonts } = await loadAssets();
  let low = MIN_TITLE_SIZE;
  let high = MAX_TITLE_SIZE;
  let selected = null;

  while (low <= high) {
    const fontSize = Math.floor((low + high) / 2);
    const block = await renderTitleBlock(title, fontSize, fonts, lang);
    if (titleFits(block)) {
      selected = block;
      low = fontSize + 1;
    } else {
      high = fontSize - 1;
    }
  }

  if (!selected) {
    throw new Error(
      `OGP title does not fit its safe area at ${MIN_TITLE_SIZE}px: ${JSON.stringify(title)}`,
    );
  }

  return {
    ...selected,
    left: Math.round(BUBBLE_LEFT + (BUBBLE_WIDTH - selected.width) / 2),
    top: Math.round(BUBBLE_TOP + (BUBBLE_HEIGHT - selected.height) / 2),
  };
}

export async function selectTitleFontSize(title, lang = "ja") {
  return (await layoutTitle(title, lang)).fontSize;
}

function card(avatarDataUrl) {
  return element(
    "div",
    {
      style: {
        display: "flex",
        position: "relative",
        width: OGP_WIDTH,
        height: OGP_HEIGHT,
        backgroundColor: "#656cef",
      },
    },
    element("div", {
      style: {
        display: "flex",
        position: "absolute",
        left: BUBBLE_LEFT,
        top: BUBBLE_TOP,
        width: BUBBLE_WIDTH,
        height: BUBBLE_HEIGHT,
        backgroundColor: "#ffffff",
      },
    }),
    element("div", {
      style: {
        display: "flex",
        position: "absolute",
        left: 210,
        top: 374,
        width: 112,
        height: 61,
        backgroundColor: "#ffffff",
        clipPath: "polygon(29% 0, 100% 0, 0 100%)",
      },
    }),
    element(
      "div",
      {
        style: {
          display: "flex",
          position: "absolute",
          left: 31,
          top: 408,
          width: 200,
          height: 200,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 100,
          backgroundColor: "#ffffff",
        },
      },
      element("img", {
        src: avatarDataUrl,
        width: 145,
        height: 145,
        style: { width: 145, height: 145, borderRadius: 79, objectFit: "cover" },
      }),
    ),
    element(
      "div",
      {
        style: {
          display: "flex",
          position: "absolute",
          left: 659,
          top: 527,
          width: 508,
          height: 58,
          alignItems: "center",
          color: "#ffffff",
          fontFamily: "Alexandria",
          fontSize: 52,
          fontWeight: 600,
          lineHeight: 1,
        },
      },
      "popyson.com/blog",
    ),
  );
}

async function renderBaseCard(fonts, avatarDataUrl) {
  baseCardPromise ??= satori(card(avatarDataUrl), {
    width: OGP_WIDTH,
    height: OGP_HEIGHT,
    fonts,
  }).then((svg) => sharp(Buffer.from(svg)).png().toBuffer());
  return baseCardPromise;
}

export async function renderArticleOgp(title, lang = "ja") {
  const { fonts, avatarDataUrl } = await loadAssets();
  const [basePng, titleLayout] = await Promise.all([
    renderBaseCard(fonts, avatarDataUrl),
    layoutTitle(title, lang),
  ]);
  const png = await sharp(basePng)
    .composite([{ input: titleLayout.png, left: titleLayout.left, top: titleLayout.top }])
    .removeAlpha()
    .png()
    .toBuffer();
  return { png, fontSize: titleLayout.fontSize, titleLayout };
}

export async function generateArticleOgpImages(posts, distDir) {
  const generated = [];
  for (const post of posts) {
    for (const lang of ["ja", "en"]) {
      const title = post.title?.[lang] || post.title?.ja || "";
      const publicPath = articleOgpPath(post.id, lang, title);
      const outputPath = join(distDir, publicPath.slice(1));
      const { png, fontSize } = await renderArticleOgp(title, lang);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, png);
      generated.push({ id: post.id, lang, publicPath, outputPath, fontSize });
    }
  }
  return generated;
}
