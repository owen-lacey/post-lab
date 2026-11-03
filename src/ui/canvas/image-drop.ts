import { IMAGE_EXTENSIONS, MAX_IMAGE_BYTES } from '../../shared/images';
import type { Size } from './new-item';

/** Longest side of a newly added image; larger images are scaled down to it. */
const MAX_IMAGE_SIDE = 480;

/** An image with no size of its own (an SVG without width and height). */
const UNSIZED_IMAGE: Size = { w: 320, h: 240 };

/** The size an image is added at: its own, scaled down to fit `MAX_IMAGE_SIDE`. */
export function fitImage(width: number, height: number): Size {
  if (width <= 0 || height <= 0) return UNSIZED_IMAGE;
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(width, height));
  return { w: Math.max(1, Math.round(width * scale)), h: Math.max(1, Math.round(height * scale)) };
}

/** Decodes the image to read its natural size. */
export async function imageSize(file: Blob): Promise<Size> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return fitImage(image.naturalWidth, image.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The files the board can show as images. */
export function imageFiles(files: Iterable<File>): File[] {
  return [...files].filter((file) => Object.hasOwn(IMAGE_EXTENSIONS, file.type));
}

/** Why the file can't be uploaded, or undefined if it can. */
export function uploadProblem(file: File): string | undefined {
  if (file.size <= MAX_IMAGE_BYTES) return undefined;
  return `${file.name} is larger than ${String(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`;
}
