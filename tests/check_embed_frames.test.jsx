import { afterEach, describe, expect, test } from "vitest";

import { watchEmbedFrames } from "../src/embedFrames.js";

const X_SRC = "https://platform.twitter.com/embed/Tweet.html?id=20&dnt=true&theme=light";
const INSTAGRAM_SRC = "https://www.instagram.com/p/Dbd3EBdnW_u/embed/captioned/";

const stops = [];

function mount(embeds) {
  const root = document.createElement("div");
  root.className = "prose";
  root.innerHTML = embeds
    .map(
      ([name, src]) =>
        `<div class="embed" data-embed="${name}"><div class="embed-frame"><iframe src="${src}" title="${name}"></iframe></div></div>`,
    )
    .join("");
  // The article body stays out of the document: a connected frame would have
  // the DOM fetch the real service URL, and this is about the messages a frame
  // sends back rather than what it renders. Unloaded, it has no content window
  // to answer from, so each one gets a stand-in to post its messages as.
  for (const frame of root.querySelectorAll("iframe")) {
    Object.defineProperty(frame, "contentWindow", { value: { frame }, configurable: true });
  }
  stops.push(watchEmbedFrames(root));
  return root;
}

function frames(root) {
  return [...root.querySelectorAll("iframe")];
}

function post(frame, origin, data) {
  window.dispatchEvent(new MessageEvent("message", { origin, data, source: frame.contentWindow }));
}

function xResize(height) {
  return JSON.stringify({
    "twttr.embed": {
      jsonrpc: "2.0",
      method: "twttr.private.resize",
      params: [{ width: 550, height }],
    },
  });
}

afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.documentElement.removeAttribute("data-theme");
});

describe("watchEmbedFrames", () => {
  test("gives the frame the height X measures", () => {
    const root = mount([["x", X_SRC]]);
    const [frame] = frames(root);

    post(frame, "https://platform.twitter.com", xResize(225));

    expect(frame.style.height).toBe("225px");
    // The measurement is the post, so the box around it follows the frame
    // rather than spending its border on the last two pixels.
    expect(frame.parentElement.style.height).toBe("auto");
  });

  test("gives the frame the height Instagram measures", () => {
    const root = mount([["instagram", INSTAGRAM_SRC]]);
    const [frame] = frames(root);

    post(frame, "https://www.instagram.com", { type: "MEASURE", details: { height: 887 } });

    expect(frame.style.height).toBe("887px");
  });

  test("sizes the frame the message came from", () => {
    const root = mount([
      ["x", X_SRC],
      ["x", X_SRC.replace("id=20", "id=21")],
    ]);
    const [first, second] = frames(root);

    post(second, "https://platform.twitter.com", xResize(310));

    expect(first.style.height).toBe("");
    expect(second.style.height).toBe("310px");
  });

  test.each([
    ["a stranger's origin", "https://evil.example.com", xResize(9000)],
    ["a message X does not send", "https://platform.twitter.com", JSON.stringify({ height: 9000 })],
    ["text that is not JSON", "https://platform.twitter.com", "resize me"],
    ["a height of zero", "https://www.instagram.com", { type: "MEASURE", details: { height: 0 } }],
  ])("ignores %s", (_name, origin, data) => {
    const root = mount([["x", X_SRC]]);
    const [frame] = frames(root);

    post(frame, origin, data);

    expect(frame.style.height).toBe("");
  });

  test("points the X frame at the theme the site is showing", async () => {
    document.documentElement.setAttribute("data-theme", "dark");
    const root = mount([["x", X_SRC]]);
    const [frame] = frames(root);

    expect(frame.src).toContain("theme=dark");

    document.documentElement.setAttribute("data-theme", "light");
    await Promise.resolve();

    expect(frame.src).toContain("theme=light");
  });

  test("drops a measured height when the theme reloads the frame", async () => {
    const root = mount([["x", X_SRC]]);
    const [frame] = frames(root);
    post(frame, "https://platform.twitter.com", xResize(225));

    document.documentElement.setAttribute("data-theme", "dark");
    await Promise.resolve();

    expect(frame.style.height).toBe("");
    expect(frame.parentElement.style.height).toBe("");
  });

  test("leaves an Instagram frame on the URL it was built with", async () => {
    const root = mount([["instagram", INSTAGRAM_SRC]]);
    const [frame] = frames(root);

    document.documentElement.setAttribute("data-theme", "dark");
    await Promise.resolve();

    expect(frame.src).toBe(INSTAGRAM_SRC);
  });

  test("stops listening once the article is gone", () => {
    const root = mount([["x", X_SRC]]);
    const [frame] = frames(root);

    for (const stop of stops.splice(0)) stop();
    post(frame, "https://platform.twitter.com", xResize(225));

    expect(frame.style.height).toBe("");
  });
});
