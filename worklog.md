# Worklog — Resonate Music Player

---
Task ID: 1
Agent: main (Claude)
Task: Build a Spotify-style local music player with full UI, frontend, backend, playlist management, album preferences, and an auto-play-next algorithm that picks songs based on the current music theme.

Work Log:
- Loaded the `fullstack-dev` skill and ran `init-fullstack.sh` to scaffold the Next.js 16 + Tailwind + shadcn/ui project.
- Designed Prisma schema: `User`, `Track` (cached metadata + mood/tempo), `Playlist`, `PlaylistTrack`, `SavedAlbum`, `StylePreference`, `ListeningHistory`. Pushed schema to SQLite.
- Built `src/lib/saavn.ts` — a unified music catalog client. Originally targeted the unofficial JioSaavn API (saavn.dev) but that host was blocked from the sandbox (DNS NXDOMAIN). Pivoted to a multi-source strategy using:
  - iTunes Search API (no key, 30-sec previews, full metadata + cover art, lookup by ID)
  - LRCLIB (no key, synced + plain lyrics, search by artist+track)
- Implemented `src/lib/recommend.ts` — the mood/theme extraction engine:
  - `MOODS` taxonomy of 8 moods (energetic, happy, romantic, chill, sad, party, focused, soulful) each with keyword vocabularies
  - `extractTheme(song)` derives a theme from title + album + label + duration
  - `buildTasteProfile(history)` ranks moods/languages/artists from play history
  - `pickNextTrack()` builds a search query from the current song's theme + taste + preferences, biases by `discoveryLevel`, weighted-randomly picks from results, excludes recently played
- Built API routes under `/api`:
  - `search` (GET): proxy to iTunes search
  - `song` (GET): song details + lyrics + theme extraction
  - `songs/[id]/lyrics`: LRCLIB lyrics
  - `album` (GET/POST/DELETE): album details + save/unsave
  - `albums` (GET): list saved
  - `playlists` (GET/POST), `playlists/[id]` (GET/PATCH/DELETE), `playlists/[id]/tracks` (GET/POST/DELETE)
  - `preferences` (GET/POST): style preferences
  - `history` (GET/POST): listening history
  - `recommend/next` (GET): the auto-play-next algorithm endpoint
  - `init` (GET): bootstrap all data on app start
- Built Zustand player store (`src/lib/player-store.ts`) with queue, current track, shuffle, repeat modes, recent list, preferences, and all player actions (play, pause, next, prev, seek, volume, appendRecommendation, pushRecent).
- Built `src/hooks/use-audio-engine.ts` — owns the `<audio>` element, wires events, **implements auto-play-next**: when a track ends and the queue is empty, it calls `/api/recommend/next?saavnId=...&exclude=...` and appends the recommended track to the queue, then plays it. Records listening history (completed) on each end.
- UI components:
  - `Sidebar` — Home/Search/Library nav, "Create playlist" button, lists playlists + saved albums + style preferences link, mobile slide-in
  - `TopBar` — sticky top bar with back/forward + "Tune algorithm" button
  - `PlayerBar` — Spotify-style bottom bar with album art, controls, seek slider, volume, mini visualizer, lyrics + queue buttons
  - `TrackRow` — list-style track with hover-to-play, equalizer indicator when active
  - `TrackCard` — grid-style card with hover-play overlay
  - `Visualizer` — animated equalizer bars widget
  - `EqualizerBars` — small now-playing indicator
  - `QueuePanel` — side sheet showing now playing / next up / played
  - `LyricsPanel` — side sheet with synced lyrics (auto-scrolls to active line via .lrc timestamps) and plain fallback
- Views:
  - `HomeView` — hero greeting, 8 clickable mood chips (each gradient-coloured), recently played, trending, saved albums
  - `SearchView` — debounced search with all/songs/albums filter pills
  - `LibraryView` — tabs for Saved Albums and Recently Played
  - `PlaylistView` — Spotify-style gradient header, play button, track list with add/remove songs dialog
  - `AlbumView` — same gradient header pattern, save/unsave heart button
  - `PreferencesView` — auto-play toggle, discovery level slider, mood multi-select chips, language multi-select chips, save/reset
- Page.tsx orchestrates everything: audio engine, sidebar + main content with view switching, player bar, queue/lyrics side panels.
- Updated `globals.css` with a Spotify-inspired dark theme (deep blue-black background, green primary accent), custom scrollbar styles, glass effect, equalizer keyframes, gradient hero backgrounds.
- Lint passes clean (one minor fix needed: deferred `setLoading(true)` via microtask to avoid the `set-state-in-effect` rule).

Stage Summary:
- Final stack: Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + Prisma/SQLite + Zustand + iTunes/LRCLIB.
- All 6 core views functional in browser (verified with Agent Browser): Home, Search, Library, Playlist detail, Album detail, Preferences.
- Playback works (iTunes 30-sec m4a previews), seek bar updates, lyrics load in Devanagari for Hindi tracks, queue panel populates.
- **Auto-play-next algorithm verified working**: when a track ends, `/api/recommend/next` is called with the current saavnId + excluded IDs and returns a new track that gets appended to the queue and auto-plays. Visible in dev.log as `GET /api/recommend/next?saavnId=...&exclude=... 200`.
- Playlist CRUD works: created "My Chill Mix", searched Arijit Singh, added 3 tracks, saw them appear in the playlist view.
- Preferences save/load works: selected Romantic/Chill moods + Hindi language, saved successfully, persisted to DB.
- Album saving works: heart toggle on album view, saved to library, appears in sidebar.
- Note: original ask was for JioSaavn (320kbps full songs), but saavn.dev is DNS-blocked from the sandbox. Pivoted to iTunes API which gives 30-sec previews. The client interface is identical, so swapping back to a JioSaavn wrapper (when running outside the sandbox) is a single-file change in `src/lib/saavn.ts`.
