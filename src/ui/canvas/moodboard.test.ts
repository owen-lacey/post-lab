import { describe, expect, it } from 'vitest';
import { fitImage, imageFiles, uploadProblem } from './image-drop';
import { newImage, newLink } from './new-item';
import { isPlayable } from './playable';

describe('adding images', () => {
  it('keeps small images at their own size and scales large ones to fit 480 px', () => {
    expect(fitImage(200, 100)).toEqual({ w: 200, h: 100 });
    expect(fitImage(1920, 1080)).toEqual({ w: 480, h: 270 });
    expect(fitImage(1000, 3000)).toEqual({ w: 160, h: 480 });
  });

  it('gives an image with no size of its own a default size', () => {
    expect(fitImage(0, 0)).toEqual({ w: 320, h: 240 });
  });

  it('keeps only the image types the board renders', () => {
    const files = [
      new File([''], 'a.png', { type: 'image/png' }),
      new File([''], 'b.svg', { type: 'image/svg+xml' }),
      new File([''], 'c.tiff', { type: 'image/tiff' }),
      new File([''], 'd.txt', { type: 'text/plain' }),
    ];
    expect(imageFiles(files).map((file) => file.name)).toEqual(['a.png', 'b.svg']);
  });

  it('refuses images over 25 MB before uploading', () => {
    const big = new File([new Uint8Array(25 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' });
    expect(uploadProblem(big)).toBe('big.png is larger than 25 MB.');
    expect(uploadProblem(new File(['x'], 'ok.png', { type: 'image/png' }))).toBeUndefined();
  });

  it('centres a new image on the point it was added at', () => {
    expect(
      newImage('1mage001', { x: 100, y: 100 }, 'assets/1mage001.png', { w: 41, h: 20 }),
    ).toEqual({
      type: 'image',
      x: 80,
      y: 90,
      w: 41,
      h: 20,
      src: 'assets/1mage001.png',
      id: '1mage001',
      body: '',
    });
  });
});

describe('links', () => {
  it('plays YouTube and Vimeo links and video files inline, but not other pages', () => {
    expect(isPlayable('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(isPlayable('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(isPlayable('https://vimeo.com/76979871')).toBe(true);
    expect(isPlayable('https://example.com/clip.mp4')).toBe(true);
    expect(isPlayable('https://example.com/blog/churn')).toBe(false);
  });

  it('makes a playable link big enough for its player', () => {
    const centre = { x: 0, y: 0 };
    expect(newLink('l1nk0001', centre, 'https://youtu.be/dQw4w9WgXcQ')).toMatchObject({
      w: 480,
      h: 310,
    });
    expect(newLink('l1nk0002', centre, 'https://example.com/')).toMatchObject({ w: 320, h: 140 });
  });
});
