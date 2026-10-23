"use client"

import { useEffect, useRef } from "react"
import { usePlayer } from "@/lib/player-store"
import { recordPlay, getPreferences } from "@/lib/storage"
import { pickNextTrack, getTasteProfileFromStorage } from "@/lib/recommend"
import { getSongDetails } from "@/lib/saavn"
import type { Track } from "@/lib/player-store"

export function useAudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

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

  // Fetch stream URL if missing (Piped API needs this)
  useEffect(() => {
    if (!currentTrack) return
    if (currentTrack.streamUrl) return

    let cancelled = false
    getSongDetails(currentTrack.id)
      .then((details) => {
        if (cancelled || !details?.streamUrl) return
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
      })
      .catch((e) => console.error("Failed to fetch stream URL:", e))

    return () => {
      cancelled = true
    }
  }, [currentTrack?.id])

  // Load new track when currentTrack changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!currentTrack?.streamUrl) return
    if (audio.src !== currentTrack.streamUrl) {
      audio.src = currentTrack.streamUrl
      audio.currentTime = 0
    }
    if (isPlaying) {
      audio.play().catch(() => { })
    }
  }, [currentTrack?.id, currentTrack?.streamUrl])

  // Play / pause syncing
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack?.streamUrl) return
    if (isPlaying) {
      audio.play().catch(() => { })
    } else {
      audio.pause()
    }
  }, [isPlaying, currentTrack?.id, currentTrack?.streamUrl])

  // Volume / mute
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = muted ? 0 : volume
  }, [volume, muted])

  // Report progress + handle end-of-track
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
