'use client'

import React, { useState, useCallback } from 'react'
import {
  Zap,
  Activity,
  Target,
  Bomb,
  Heart,
  Radio,
  Waves,
  Sparkles,
  TrendingUp,
  TrendingDown,
  LucideIcon,
} from 'lucide-react'
import { CueType, DragData } from '../lib/types'

interface CueDefinition {
  type: CueType
  name: string
  icon: LucideIcon
  color: string
  description: string
  isRamp?: boolean
}

const CUE_DEFINITIONS: CueDefinition[] = [
  {
    type: 'rumble_low',
    name: 'Rumble Low',
    icon: Waves,
    color: '#22c55e',
    description:
      'A gentle, low intensity rumble suitable for subtle feedback like soft impacts or background vibrations.',
  },
  {
    type: 'rumble_high',
    name: 'Rumble High',
    icon: Radio,
    color: '#ef4444',
    description: 'A strong, high intensity rumble to draw attention or signal important events.',
  },
  {
    type: 'kick_soft',
    name: 'Kick Soft',
    icon: Target,
    color: '#22c55e',
    description: 'A quick soft kick vibration for light impact sensations.',
  },
  {
    type: 'kick_hard',
    name: 'Kick Hard',
    icon: Zap,
    color: '#ef4444',
    description: 'A sharp hard kick vibration for noticeable impacts.',
  },
  {
    type: 'heartbeat_slow',
    name: 'Heartbeat Slow',
    icon: Heart,
    color: '#facc15',
    description: 'A slow, rhythmic heartbeat vibration creating calm or tension.',
  },
  {
    type: 'heartbeat_fast',
    name: 'Heartbeat Fast',
    icon: Activity,
    color: '#f97316',
    description: 'A fast-paced heartbeat to build excitement or urgency.',
  },
  {
    type: 'pulse',
    name: 'Pulse',
    icon: Sparkles,
    color: '#22c55e',
    description: 'A rhythmic pulsing vibration, soft and continuous.',
  },
  {
    type: 'explosion',
    name: 'Explosion',
    icon: Bomb,
    color: '#dc2626',
    description: 'A sudden, strong burst of vibration for explosive effects.',
  },
  {
    type: 'ramp_up',
    name: 'Ramp Up',
    icon: TrendingUp,
    color: '#F59E0B',
    description: 'A vibration that gradually increases in intensity over time.',
    isRamp: true,
  },
  {
    type: 'ramp_down',
    name: 'Ramp Down',
    icon: TrendingDown,
    color: '#F59E0B',
    description: 'A vibration that gradually decreases in intensity over time.',
    isRamp: true,
  },
]

interface WaveformProps {
  type: CueType
  color: string
}

// Simple custom waveform visual per cue type
function Waveform({ type, color }: WaveformProps) {
  const bars = []

  // Define bar heights and animation delays for different cue types
  const waveformMap: Record<CueType, number[]> = {
    rumble_low: [4, 6, 5, 6, 4],
    rumble_high: [8, 12, 10, 12, 8],
    kick_soft: [2, 8, 3, 8, 2],
    kick_hard: [3, 14, 5, 14, 3],
    heartbeat_slow: [5, 10, 5, 10, 5],
    heartbeat_fast: [7, 14, 7, 14, 7],
    pulse: [6, 6, 6, 6, 6],
    explosion: [14, 14, 14, 14, 14],
    ramp_up: [2, 6, 10, 14, 18],
    ramp_down: [18, 14, 10, 6, 2],
  }

  const heights = waveformMap[type] || [5, 7, 5, 7, 5]

  for (let i = 0; i < heights.length; i++) {
    bars.push(
      <div
        key={i}
        style={{
          width: 6,
          height: heights[i],
          marginRight: 4,
          borderRadius: 2,
          backgroundColor: color,
          animation:
            type === 'heartbeat_fast' || type === 'heartbeat_slow'
              ? `wavePulse 1.5s ease-in-out ${i * 0.3}s infinite alternate`
              : undefined,
          opacity: 0.8,
        }}
      />
    )
  }

  return (
    <>
      <style>{`
        @keyframes wavePulse {
          0% { transform: scaleY(1); opacity: 0.6; }
          100% { transform: scaleY(1.4); opacity: 1; }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 6 }}>
        {bars}
      </div>
    </>
  )
}

interface CueLibraryProps {
  onAddCue: (type: CueType, startTime: number, targetTrack?: number) => void
  currentTime: number
}

export default function CueLibrary({ onAddCue, currentTime }: CueLibraryProps) {
  const [selectedCue, setSelectedCue] = useState<CueType | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, type: CueType) => {
    const dragData: DragData = {
      type: 'cue-from-library',
      cueType: type,
    }
    e.dataTransfer.setData('application/json', JSON.stringify(dragData))
    e.dataTransfer.effectAllowed = 'copy'
    e.currentTarget.classList.add('opacity-50')
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50')
  }, [])

  const handleDoubleClick = useCallback(
    (type: CueType) => {
      onAddCue(type, currentTime, 0)
    },
    [onAddCue, currentTime],
  )

  const handleClick = useCallback(
    (type: CueType) => {
      setSelectedCue((prev) => (prev === type ? null : type))
    },
    [],
  )

  return (
    <div className="w-64 bg-card border-r border-border p-4 flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Haptic Cues</h2>
      <div className="space-y-2 flex-grow overflow-y-auto">
        {CUE_DEFINITIONS.map(({ type, name, icon: Icon, color, description, isRamp }) => {
          const isSelected = selectedCue === type
          return (
            <div
              key={type}
              onClick={() => handleClick(type)}
              className={`p-3 rounded-lg cursor-pointer transition-colors duration-200 select-none ${
                isSelected ? 'bg-muted/80' : 'bg-muted'
              } group`}
              draggable
              onDragStart={(e) => handleDragStart(e, type)}
              onDragEnd={handleDragEnd}
              onDoubleClick={() => handleDoubleClick(type)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-sm flex-shrink-0"
                  style={{
                    background: color,
                    ...(isRamp && {
                      border: '1px solid rgba(255,255,255,0.2)',
                      backgroundSize: '100% 100%',
                    }),
                  }}
                />
                <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium truncate">{name}</span>
                {isRamp && (
                  <span className="text-xs text-muted-foreground bg-muted-foreground/10 px-1 py-0.5 rounded text-orange-400">
                    RAMP
                  </span>
                )}
              </div>
              {isSelected && (
                <div className="mt-2 text-xs text-muted-foreground select-text">
                  <p>{description}</p>
                  <Waveform type={type} color={color} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 text-xs text-muted-foreground space-y-2">
        <div>
          <p className="font-medium mb-1">How to add cues:</p>
          <p>• Drag to timeline for precise placement</p>
          <p>• Double-click to add at playhead position</p>
        </div>
        <div>
          <p className="font-medium mb-1">Multi-selection:</p>
          <p>• Ctrl/Cmd+click for multiple selection</p>
          <p>• Drag to select multiple cues</p>
          <p>• Delete/Backspace to remove selected</p>
        </div>
      </div>
    </div>
  )
}
