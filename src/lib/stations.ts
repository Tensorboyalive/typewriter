// Known-stable 24/7 YouTube Live streams delegated via <iframe>.
// Using youtube-nocookie.com — fewer tracking cookies, less aggressive CSP.
// Autoplay rule: iframe must mount in response to a user gesture (see MusicPlayer).

export type Station = { id: string; name: string; vibe: string; videoId: string }

export const STATIONS: Station[] = [
  { id: 'lofi',     name: 'Lofi Girl',     vibe: 'study',  videoId: 'jfKfPfyJRdk' },
  { id: 'synth',    name: 'Synthwave',     vibe: 'night',  videoId: '4xDzrJKXOOY' },
  { id: 'coffee',   name: 'Coffee Shop',   vibe: 'cozy',   videoId: 'h2zkV-l_TbQ' },
  { id: 'rain',     name: 'Rain Ambience', vibe: 'sleep',  videoId: 'mPZkdNFkNps' },
  { id: 'ocean',    name: 'Ocean Waves',   vibe: 'reset',  videoId: 'V1bFr2SWP1I' },
  { id: 'chillhop', name: 'Chillhop Jazz', vibe: 'focus',  videoId: '5yx6BWlEVcY' },
]

export const stationEmbedUrl = (videoId: string) =>
  `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&playsinline=1`
