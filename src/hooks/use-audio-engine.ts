"use client"

import { useEffect, useRef } from "react"
import { usePlayer } from "@/lib/player-store"
import { recordPlay, getPreferences } from "@/lib/storage"
import { pickNextTrack, getTasteProfileFromStorage } from "@/lib/recommend"
import type { Track } from "@/lib/player-store"

/**
 * useAudioEngine
 *
 * Owns the single <audio> element, wires it to the player store.
 * Implements the auto-play-next behaviour — all client-side, no API calls:
 *   - record a play to localStorage when a track ends
 *   - if there's a next track in queue, play it
 *   - else if autoPlayNext is true, use the recommend algorithm to pick a
 *     track matching the current theme, append it to the queue, and play
 */
export function useAudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Create the audio element lazily on the client
  if (typeof window !== "undefined" && !audioRef.current) {
    audioRef.current = new Audio()
    audioRef.current.preload = "auto"
  }

  const { currentTrack, isPlaying, volume, muted } = usePlayer.getState()

  // ---- load new track when currentTrack changes ----
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!currentTrack?.streamUrl) return
    if (audio.src !== currentTrack.streamUrl) {
      audio.src = currentTrack.streamUrl
      audio.currentTime = 0
    }
    if (isPlaying) {
      audio.play().catch(() => {})
    }
  }, [currentTrack?.id])

  // ---- play / pause syncing ----
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack?.streamUrl) return
    if (isPlaying) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [isPlaying, currentTrack?.id])

  // ---- volume / mute ----
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = muted ? 0 : volume
  }, [volume, muted])

  // ---- report progress + duration + handle end-of-track ----
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTime = () => {
      usePlayer.getState().setProgress(audio.currentTime)
    }
    const onLoaded = () => {
      usePlayer.getState().setDuration(audio.duration || 0)
    }
    const onEnded = async () => {
      const s = usePlayer.getState()

      // Record to localStorage history
      if (s.currentTrack) {
        recordPlay(s.currentTrack, { completed: true })
      }

      if (s.repeat === "one") {
        audio.currentTime = 0
        audio.play().catch(() => {})
        return
      }

      const hasNext = s.shuffle
        ? s.queue.length > 1
        : s.queueIndex + 1 < s.queue.length

      if (s.repeat === "all" || hasNext) {
        s.next()
        return
      }

      // Queue exhausted -> try auto-play-next recommendation
      if (s.autoPlayNext && s.currentTrack) {
        try {
          const prefs = getPreferences()
          const taste = getTasteProfileFromStorage()
          const exclude = s.queue.map((t) => t.id)
          const next = await pickNextTrack({
            currentSong: {
              id: s.currentTrack.id,
              title: s.currentTrack.title,
              artist: s.currentTrack.artist,
              album: s.currentTrack.album ?? "",
              albumId: s.currentTrack.albumId,
              image: s.currentTrack.image ?? "",
              streamUrl: s.currentTrack.streamUrl ?? "",
              duration: s.currentTrack.duration,
              language: s.currentTrack.language,
              label: s.currentTrack.label,
              year: s.currentTrack.year,
            },
            taste,
            discoveryLevel: prefs.discoveryLevel,
            preferredMoods: prefs.moods as any,
            preferredLanguages: prefs.languages,
            excludeIds: [...exclude, ...taste.recentlyPlayedIds],
          })

          if (next) {
            const nextTrack: Track = {
              id: next.id,
              title: next.title,
              artist: next.artist,
              album: next.album,
              albumId: next.albumId,
              image: next.image,
              streamUrl: next.streamUrl,
              duration: next.duration,
              language: next.language,
              label: next.label,
              year: next.year,
            }
            s.appendRecommendation(nextTrack)
          }
        } catch (e) {
          console.error("Auto-play-next failed:", e)
          usePlayer.setState({ isPlaying: false })
        }
      } else {
        usePlayer.setState({ isPlaying: false })
      }
    }

    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("loadedmetadata", onLoaded)
    audio.addEventListener("ended", onEnded)
    return () => {
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("loadedmetadata", onLoaded)
      audio.removeEventListener("ended", onEnded)
    }
  }, [])
}
