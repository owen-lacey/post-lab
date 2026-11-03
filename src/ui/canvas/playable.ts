import { canPlay } from 'react-player/patterns';

/** Whether react-player can play the URL inline (YouTube, Vimeo, a video file, …). */
export function isPlayable(url: string): boolean {
  return Object.values(canPlay).some((test) => test(url));
}
