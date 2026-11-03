import ReactPlayer from 'react-player';

/** Plays a link inline; loaded on demand, and react-player loads each provider on demand too. */
export default function LinkPlayer({ url }: { url: string }) {
  return <ReactPlayer src={url} controls width="100%" height="100%" />;
}
