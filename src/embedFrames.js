/*
 * Post embeds that size themselves.
 *
 * A video keeps its 16:9 box, but an X post and an Instagram post are as tall
 * as their text and pictures make them, and only the service knows how tall
 * that is. Both measure themselves and post the number to the page, so the
 * frame starts at the height in src/app.css and takes the measured one as soon
 * as it arrives.
 *
 * X also renders in the theme its URL asks for, which the visitor can change
 * after the page is built, so the frame is pointed at the matching theme
 * whenever the site switches.
 */

const X_ORIGIN = "https://platform.twitter.com";
const INSTAGRAM_ORIGIN = "https://www.instagram.com";
const FRAME_SELECTOR = ".embed-frame iframe";
const X_FRAME_SELECTOR = '.embed[data-embed="x"] iframe';

function messageData(event) {
  if (typeof event.data === "string") {
    try {
      return JSON.parse(event.data);
    } catch {
      return null;
    }
  }
  return event.data && typeof event.data === "object" ? event.data : null;
}

// X speaks a JSON-RPC dialect under a `twttr.embed` envelope; Instagram posts a
// plain `MEASURE`. Both report CSS pixels.
function measuredHeight(event) {
  const data = messageData(event);
  if (!data) return 0;
  if (event.origin === X_ORIGIN) {
    const call = data["twttr.embed"];
    if (call?.method !== "twttr.private.resize") return 0;
    return Number(call.params?.[0]?.height) || 0;
  }
  if (event.origin === INSTAGRAM_ORIGIN) {
    return data.type === "MEASURE" ? Number(data.details?.height) || 0 : 0;
  }
  return 0;
}

function frameFromSource(root, source) {
  if (!source) return null;
  for (const frame of root.querySelectorAll(FRAME_SELECTOR)) {
    if (frame.contentWindow === source) return frame;
  }
  return null;
}

// The measurement covers the post itself, so it goes on the frame and the box
// around it grows to match. Putting it on the box instead would spend the
// border on the post and leave a scrollbar over the last two pixels.
function setHeight(frame, height) {
  frame.style.height = `${height}px`;
  if (frame.parentElement) frame.parentElement.style.height = "auto";
}

function clearHeight(frame) {
  frame.style.removeProperty("height");
  frame.parentElement?.style.removeProperty("height");
}

function applyTheme(root, theme) {
  for (const frame of root.querySelectorAll(X_FRAME_SELECTOR)) {
    let url;
    try {
      url = new URL(frame.src);
    } catch {
      continue;
    }
    if (url.searchParams.get("theme") === theme) continue;
    url.searchParams.set("theme", theme);
    // Reloading the frame drops the height it reported, so the box goes back to
    // the one in the stylesheet until the new frame measures itself.
    clearHeight(frame);
    frame.src = String(url);
  }
}

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/**
 * Watch the embeds inside an article body. Returns the teardown.
 *
 * @param {HTMLElement} root
 * @returns {() => void}
 */
export function watchEmbedFrames(root) {
  const onMessage = (event) => {
    const height = measuredHeight(event);
    if (height <= 0) return;
    const frame = frameFromSource(root, event.source);
    if (frame) setHeight(frame, height);
  };

  const observer = new MutationObserver(() => applyTheme(root, currentTheme()));
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  applyTheme(root, currentTheme());
  window.addEventListener("message", onMessage);

  return () => {
    observer.disconnect();
    window.removeEventListener("message", onMessage);
  };
}
