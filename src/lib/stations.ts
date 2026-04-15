// Music stations — split between two flavors:
// 1. Live ambient streams (Lofi Girl, Synthwave, Rain, etc.) — single video, 24/7 loop.
// 2. Manu's mixes — seeded from a hero video + YouTube Mix radio (list=RD{id}),
//    which auto-builds a thematic playlist of related songs.
//
// The user gave us four curated playlists. Rather than hard-code every video ID
// (which rot quickly when uploaders delete tracks), we pick one reliable seed per
// mix and let YouTube's recommendation engine carry the thread.

export type Station = {
  id: string
  name: string
  vibe: string
  videoId: string
  // If true, append list=RD{videoId} to enable YouTube Mix radio after the seed plays.
  mix?: boolean
}

export const STATIONS: Station[] = [
  // Manu's mixes — thematic radios seeded from one hero track each.
  { id: 'indie',    name: 'Indian Indie',     vibe: 'anuv · local train · prateek', videoId: 'fS9xh0RvM00', mix: true },
  { id: 'retro',    name: 'Retro & Classics', vibe: 'abba · eagles · coldplay',     videoId: 'xFrGuyw1V8s', mix: true },
  { id: 'bolly',    name: 'Bollywood Dance',  vibe: 'znmd · yjhd · cocktail',        videoId: '2WvN2Zlck24', mix: true },
  { id: 'ghazal',   name: 'Ghazal & Gold',    vibe: 'jagjit · rafi · lata',          videoId: 'uetQokE6HNM', mix: true },

  // Ambient streams — always-on 24/7 loops.
  { id: 'lofi',     name: 'Lofi Girl',        vibe: 'study',  videoId: 'jfKfPfyJRdk' },
  { id: 'synth',    name: 'Synthwave',        vibe: 'night',  videoId: '4xDzrJKXOOY' },
  { id: 'coffee',   name: 'Coffee Shop',      vibe: 'cozy',   videoId: 'h2zkV-l_TbQ' },
  { id: 'rain',     name: 'Rain Ambience',    vibe: 'sleep',  videoId: 'mPZkdNFkNps' },
  { id: 'ocean',    name: 'Ocean Waves',      vibe: 'reset',  videoId: 'V1bFr2SWP1I' },
  { id: 'chillhop', name: 'Chillhop Jazz',    vibe: 'focus',  videoId: '5yx6BWlEVcY' },
]

export const stationEmbedUrl = (station: Station) => {
  const base = `https://www.youtube-nocookie.com/embed/${station.videoId}?autoplay=1&modestbranding=1&rel=0&playsinline=1`
  return station.mix ? `${base}&list=RD${station.videoId}` : base
}
