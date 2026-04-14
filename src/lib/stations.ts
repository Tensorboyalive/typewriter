// Ambient music stations for the top-right music player.
//
// Each station points at a public YouTube video — usually a 24/7 livestream
// or a long ambient video. The player uses the YouTube IFrame API to play
// audio with the video hidden.
//
// ─── How to customize ──────────────────────────────────────────────
// • Find a YouTube video or livestream you like
// • Copy the video ID from the URL:
//     https://www.youtube.com/watch?v=jfKfPfyJRdk
//                                     ^^^^^^^^^^^   ← this part
// • Add/replace an entry below.
// • For YouTube *playlists*, set `playlistId` instead of `videoId`.
//
// ─── Caveats ───────────────────────────────────────────────────────
// Some streams get taken down, renamed, or region-blocked. If a station
// won't play, replace the ID. The defaults below were stable as of the
// refactor; verify they still work from your region.

export interface Station {
  id: string
  label: string
  hint: string
  videoId?: string
  playlistId?: string
}

export const STATIONS: Station[] = [
  { id: 'lofi-girl',   label: 'Lofi Girl',        hint: 'hip hop radio — beats to relax/study to', videoId: 'jfKfPfyJRdk' },
  { id: 'sleepy',      label: 'Sleepy Beats',     hint: 'Lofi Girl — beats to sleep to',            videoId: 'rUxyKA_-grg' },
  { id: 'chillhop',    label: 'Chillhop Radio',   hint: 'jazzy / beats',                            videoId: '5yx6BWlEVcY' },
  { id: 'jazz',        label: 'Coffee Shop Jazz', hint: 'warm cafe jazz ambience',                  videoId: 'Dx5qFachd3A' },
  { id: 'classical',   label: 'Classical Focus',  hint: 'Bach / Chopin / Debussy',                  videoId: 'jgpJVI3tDbY' },
  { id: 'rain',        label: 'Rain + Thunder',   hint: 'pure rain soundscape',                     videoId: 'q76bMs-NwRk' },
  { id: 'deep-focus',  label: 'Deep Focus',       hint: 'minimal electronic for flow state',        videoId: 'nDq6TstdEi8' },
  { id: 'ambient',     label: 'Ambient Space',    hint: 'sparse drones / night',                    videoId: 'tNkZsRW7h2c' },
]
