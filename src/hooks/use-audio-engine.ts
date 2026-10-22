"use client"

import { useEffect, useRef } from "react"
import { usePlayer } from "@/lib/player-store"
import type { Track } from "@/lib/player-store"

/**
 * useAudioEngine
 *
 * Owns the single <audio> element, wires it to the player store.
 * Implements the auto-play-next behaviour:
 *   - when the current track ends, if repeat === "one", restart
 *   - else if there is a next track in queue, play it (handled by store.next())
 *   - else if autoPlayNext is true, call /api/recommend/next and append the
 *     recommended track to the queue, then play it
 */
export function useAudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Create the audio element lazily on the client
  if (typeof window !== "undefined" && !audioRef.current) {
    audioRef.current = new Audio()
    audioRef.current.preload = "auto"
  }

  const {
    currentTrack,
    isPlaying,
    volume,
    muted,
    progress,
    repeat,
    autoPlayNext,
  } = usePlayer.getState()

  // Subscribe to relevant slices for re-renders
  const state = usePlayer()

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
      audio.play().catch(() => {
        // Autoplay may be blocked until user interaction
      })
    }
    // No eslint-disable needed: currentTrack?.id is intentional dep
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
      // record listening history (completed)
      if (s.currentTrack) {
        try {
          await fetch("/api/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              saavnId: s.currentTrack.id,
              completed: true,
              skipped: false,
            }),
          })
        } catch {}
      }

      if (s.repeat === "one") {
        audio.currentTime = 0
        audio.play().catch(() => {})
        return
      }

      const hasNext =
        s.shuffle
          ? s.queue.length > 1
          : s.queueIndex + 1 < s.queue.length

      if (s.repeat === "all" || hasNext) {
        s.next()
        return
      }

      // Queue exhausted -> try auto-play-next recommendation
      if (s.autoPlayNext && s.currentTrack) {
        try {
          const exclude = s.queue.map((t) => t.id).join(",")
          const res = await fetch(
            `/api/recommend/next?saavnId=${encodeURIComponent(
              s.currentTrack.id,
            )}&exclude=${encodeURIComponent(exclude)}`,
          )
          const data = await res.json()
          if (data.track) {
            s.appendRecommendation(data.track as Track)
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

  return audioRef
}
