"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface EqualizerBarsProps {
  active?: boolean
  className?: string
  barCount?: number
}

/**
 * EqualizerBars - small animated bars indicating "now playing".
 * Pauses (flattens) when `active` is false.
 */
export function EqualizerBars({
  active = true,
  className,
  barCount = 4,
}: EqualizerBarsProps) {
  return (
    <div
      className={cn("flex items-end gap-[2px] h-3", className)}
      aria-hidden="true"
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-sm bg-primary",
            active && "bar-equalize",
          )}
          style={{
            height: "100%",
            animationDelay: `${i * 0.15}s`,
            transform: active ? undefined : "scaleY(0.25)",
            transition: "transform 0.2s ease",
          }}
        />
      ))}
    </div>
  )
}
