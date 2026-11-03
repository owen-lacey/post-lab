/** Largest image `POST /api/assets` takes. */
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

/** The image types the canvas renders (D12), by the extension a pasted one is saved with. */
export const IMAGE_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

/** The extension an image of this `Content-Type` is saved with; undefined if not one. */
export function imageExtension(contentType: string | undefined): string | undefined {
  const mediaType = contentType?.split(';')[0]?.trim().toLowerCase() ?? '';
  return Object.hasOwn(IMAGE_EXTENSIONS, mediaType) ? IMAGE_EXTENSIONS[mediaType] : undefined;
}
