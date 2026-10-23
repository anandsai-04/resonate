"use client"

import { useEffect, useRef } from "react"
import { usePlayer } from "@/lib/player-store"
import { recordPlay, getPreferences } from "@/lib/storage"
import { pickNextTrack, getTasteProfileFromStorage } from "@/lib/recommend"
import { getSongDetails } from "@/lib/saavn"
import type { Track } from "@/lib/player-store"

/**
 * useAudioEngine
 *
 * Owns the single <audio> element, wires it to the player store.
 * Implements:
 *   - lazy stream URL fetching (for Piped API where search doesn't return URLs)
 *   - auto-play-next: when track ends, pick next based on mood/taste
 *   - records plays to localStorage history
 */
export function useAudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Create the audio element in an effect (not during render)
  useEffect(() => {
    if (typeof window !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = "auto"
    }
  }, [])

  const currentTrack = usePlayer((s) => s.currentTrack)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const volume = usePlayer((s) => s.volume)
  const muted = usePlayer((s) => s.muted)

  // ---- fetch stream URL if missing (Piped API needs this) ----
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (currentTrack.streamUrl) return // Already has URL

    let cancelled = false
    getSongDetails(currentTrack.id)
      .then((details) => {
        if (cancelled || !details?.streamUrl) return
        // Update the current track and queue with the fetched URL
        const state = usePlayer.getState()
        const updatedTrack: Track = {
          ...currentTrack,
          streamUrl: details.streamUrl,
          image: details.image || currentTrack.image,
          duration: details.duration || currentTrack.duration,
          title: details.title || currentTrack.title,
          artist: details.artist || currentTrack.artist,
        }
        usePlayer.setState({
          currentTrack: updatedTrack,
          queue: state.queue.map((t) =>
            t.id === currentTrack.id ? updatedTrack : t
          ),
        })
        // If we're supposed to be playing, start now
        if (usePlayer.getState().isPlaying) {
          audio.src = updatedTrack.streamUrl
          audio.currentTime = 0
          audio.play().catch(() => { })
        }
      })
      .catch((e) => console.error("Failed to fetch stream URL:", e))

    return () => {
      cancelled = true
    }
  }, [currentTrack?.id])

  // ---- load new track when currentTrack changes ----
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!currentTrack?.streamUrl) return // Wait for URL to be fetched
    if (audio.src !== currentTrack.streamUrl) {
      audio.src = currentTrack.streamUrl
      audio.currentTime = 0
    }
    if (isPlaying) {
      audio.play().catch(() => { })
    }
  }, [currentTrack?.id, currentTrack?.streamUrl])

  // ---- play / pause syncing ----
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack?.streamUrl) return
    if (isPlaying) {
      audio.play().catch(() => { })
    } else {
      audio.pause()
    }
  }, [isPlaying, currentTrack?.id, currentTrack?.streamUrl])

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
        audio.play().catch(() => { })
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
              streamUrl: next.streamUrl, // Will be fetched lazily by the engine
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
