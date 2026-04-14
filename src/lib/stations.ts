// Known-stable 24/7 YouTube Live lofi/focus streams, delegated via <iframe>.
// Iframe audio sidesteps CORS/CSP issues we hit with the prior <audio> +
// SomaFM approach.
//
// Autoplay rule: YouTube embed autoplay only fires if the iframe mounts in
// response to a user gesture. MusicPlayer does exactly this — toggle the
// `playing` flag on click, then render the iframe with `autoplay=1`.

export type Station = {
  id: string
  name: string
  vibe: string
  embedUrl: string
}

export const STATIONS: Station[] = [
  { id: 'lofi',      name: 'Lofi Girl',     vibe: 'study',  embedUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=0' },
  { id: 'synthwave', name: 'Synthwave',     vibe: 'night',  embedUrl: 'https://www.youtube.com/embed/4xDzrJKXOOY?autoplay=1&mute=0' },
  { id: 'chillhop',  name: 'Chillhop Jazz', vibe: 'focus',  embedUrl: 'https://www.youtube.com/embed/5yx6BWlEVcY?autoplay=1&mute=0' },
  { id: 'bootleg',   name: 'Bootleg Boy',   vibe: 'chill',  embedUrl: 'https://www.youtube.com/embed/28KRPhVzCus?autoplay=1&mute=0' },
]
