// Ambient radio stations. Uses SomaFM's free public MP3 streams — they're
// CORS-friendly for <audio>, require no API key, and stay up 24/7. If a
// stream ever returns 404 or errors, swap in another SomaFM channel:
//   https://somafm.com/listen/
//
// Each entry points at a direct MP3 icecast URL for a SomaFM channel.

export interface Station {
  id: string
  name: string
  url: string
  vibe: string
}

export const STATIONS: Station[] = [
  { id: 'groove-salad',  name: 'Groove Salad',    vibe: 'chilled beats & grooves',     url: 'https://ice1.somafm.com/groovesalad-128-mp3' },
  { id: 'drone-zone',    name: 'Drone Zone',      vibe: 'atmospheric ambient',         url: 'https://ice1.somafm.com/dronezone-128-mp3' },
  { id: 'defcon',        name: 'DEF CON Radio',   vibe: 'electronic for hacking',      url: 'https://ice1.somafm.com/defcon-256-mp3' },
  { id: 'lush',          name: 'Lush',            vibe: 'sensual vocals, downtempo',   url: 'https://ice1.somafm.com/lush-128-mp3' },
  { id: 'deep-space',    name: 'Deep Space One',  vibe: 'deep space ambient',          url: 'https://ice1.somafm.com/deepspaceone-128-mp3' },
  { id: 'mission',       name: 'Mission Control', vibe: 'ambient + space audio',       url: 'https://ice1.somafm.com/missioncontrol-128-mp3' },
]
