/**
 * Turns a picked file into something the Content API will store.
 *
 * The API accepts GIF, JPEG, PNG and WebP up to 10MB and sniffs magic bytes,
 * so a phone photo fails twice over: iOS writes HEIC, and a modern camera
 * clears 10MB easily. Both are fixed here, before the upload, because the
 * request body is base64 inside JSON — shrinking afterwards would still have
 * pushed a third more bytes than the file over the wire.
 */

// Matches IMAGE_SIGNATURES in workers/content-api/src/repository.ts.
export const UPLOAD_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
// The widest content column is 860px (src/app.css), so 1920 still covers a 2x
// display with room to spare if the layout ever widens.
export const MAX_IMAGE_EDGE = 1920;
const JPEG_QUALITIES = [0.85, 0.75, 0.62, 0.5];
const HEIC_TYPES = new Set(["image/heic", "image/heif"]);
const HEIC_EXTENSIONS = new Set(["heic", "heif"]);

export function fileExtension(name) {
  return (
    String(name || "")
      .split(".")
      .pop()
      ?.toLowerCase() || ""
  );
}

export function isHeicFile(file) {
  // iOS sometimes hands over an empty type, so the extension is the fallback.
  return HEIC_TYPES.has(file.type) || HEIC_EXTENSIONS.has(fileExtension(file.name));
}

export function isUploadableImage(file) {
  return (
    UPLOAD_IMAGE_TYPES.has(file.type) ||
    ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension(file.name))
  );
}

export function isSupportedSource(file) {
  return file.size > 0 && (isUploadableImage(file) || isHeicFile(file));
}

function renamed(name, type) {
  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[type];
  if (!extension) return name;
  return `${String(name || "image").replace(/\.[^.]+$/, "")}.${extension}`;
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Canvas encoders are optional beyond PNG, and an unsupported type silently
 * yields PNG instead — which would balloon a photo. Asking for one pixel is
 * the only reliable way to know before committing to a format.
 */
async function encodesTo(type) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const blob = await canvasBlob(canvas, type, 0.8);
  return Boolean(blob) && blob.type === type;
}

async function decodeHeic(file) {
  const { heicTo } = await import("heic-to");
  const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
  return new File([blob], renamed(file.name, "image/jpeg"), { type: "image/jpeg" });
}

export function scaledSize(width, height, maxEdge) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height, scaled: false };
  const ratio = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
    scaled: true,
  };
}

/**
 * @param {File} file
 * @param {{maxEdge?: number, maxBytes?: number, onStep?: (step: string) => void}} [options]
 * @returns {Promise<{file: File, notes: string[]}>}
 */
export async function prepareImageForUpload(file, options = {}) {
  const { maxEdge = MAX_IMAGE_EDGE, maxBytes = MAX_UPLOAD_BYTES, onStep = () => {} } = options;
  const notes = [];
  let source = file;

  if (isHeicFile(source)) {
    onStep("HEIC を変換しています…");
    source = await decodeHeic(source);
    notes.push("HEIC を JPEG に変換しました");
  }

  // Re-encoding a GIF through a canvas keeps only the first frame, so an
  // oversized one has to be refused rather than quietly de-animated.
  if (source.type === "image/gif" || fileExtension(source.name) === "gif") {
    if (source.size > maxBytes) {
      throw new Error("GIF が 10MB を超えています。アニメーションを保つため自動縮小できません。");
    }
    return { file: source, notes };
  }

  const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
  const target = scaledSize(bitmap.width, bitmap.height, maxEdge);
  if (!target.scaled && source.size <= maxBytes) {
    bitmap.close?.();
    return { file: source, notes };
  }

  onStep("画像を縮小しています…");
  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, target.width, target.height);
  bitmap.close?.();

  // PNG and WebP can carry transparency, which JPEG would flatten, so the
  // source format is tried first and JPEG is the fallback when it does not fit
  // — or when the browser cannot encode it at all, as Safari cannot encode
  // WebP and would hand back a much larger PNG instead.
  const candidates = [];
  if (
    (source.type === "image/png" || source.type === "image/webp") &&
    (await encodesTo(source.type))
  ) {
    candidates.push([source.type, source.type === "image/webp" ? 0.85 : undefined]);
  }
  for (const quality of JPEG_QUALITIES) candidates.push(["image/jpeg", quality]);

  for (const [type, quality] of candidates) {
    const blob = await canvasBlob(canvas, type, quality);
    if (!blob || blob.type !== type || blob.size > maxBytes) continue;
    if (target.scaled) notes.push(`長辺 ${maxEdge}px に縮小しました`);
    if (type !== source.type)
      notes.push(`${type.replace("image/", "").toUpperCase()} で保存しました`);
    return { file: new File([blob], renamed(source.name, type), { type }), notes };
  }
  throw new Error("画像を 10MB 未満にできませんでした。手元で縮小してから選び直してください。");
}
