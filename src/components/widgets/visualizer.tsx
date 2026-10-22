"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface VisualizerProps {
  active: boolean
  className?: string
  barCount?: number
}

/**
 * AudioVisualizer
 *
 * A canvas-less, CSS-only animated bar visualizer. Pulses heights using
 * a deterministic-ish per-bar animation so that it feels reactive to
 * the music without needing access to real audio data (Web Audio API
 * would require CORS-friendly audio; we keep it simple).
 */
export function Visualizer({
  active,
  className,
  barCount = 32,
}: VisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // No-op; purely CSS-driven. Hooked to allow future canvas upgrade.
  }, [active])

  return (
    <div
      ref={containerRef}
      className={cn("flex items-end justify-center gap-[2px] h-full w-full", className)}
      aria-hidden="true"
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "flex-1 rounded-t-sm bg-gradient-to-t from-primary/30 via-primary/60 to-primary",
            active && "bar-equalize",
          )}
          style={{
            height: active ? "100%" : "10%",
            animationDelay: `${(i % 8) * 0.08}s`,
            animationDuration: `${0.7 + (i % 5) * 0.1}s`,
            transform: active ? undefined : "scaleY(0.1)",
            transformOrigin: "bottom",
            transition: "transform 0.3s ease, height 0.3s ease",
            opacity: active ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  )
}
