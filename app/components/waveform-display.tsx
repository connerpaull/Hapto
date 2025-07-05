
'use client'

import { useMemo } from 'react'
import { HapticCue } from '../lib/types'
import { generateWaveformData, pointsToSmoothPath } from '../lib/waveform-generator'

interface WaveformDisplayProps {
  cue: HapticCue
  width: number
  height: number
  zoomLevel?: number
  className?: string
}

export default function WaveformDisplay({
  cue,
  width,
  height,
  zoomLevel = 1,
  className = ''
}: WaveformDisplayProps) {
  // Memoize waveform data to avoid recalculation on every render
  const waveformData = useMemo(() => {
    return generateWaveformData(cue, width, height, zoomLevel)
  }, [
    cue.id, 
    cue.type, 
    cue.duration, 
    cue.startTime,
    // Include all cue properties for proper memoization
    'intensity' in cue ? cue.intensity : null,
    'sharpness' in cue ? cue.sharpness : null,
    'intensity_start' in cue ? cue.intensity_start : null,
    'intensity_end' in cue ? cue.intensity_end : null,
    'sharpness_start' in cue ? cue.sharpness_start : null,
    'sharpness_end' in cue ? cue.sharpness_end : null,
    width, 
    height, 
    zoomLevel
  ])

  // Convert points to smooth SVG path
  const pathData = useMemo(() => {
    return pointsToSmoothPath(waveformData.points)
  }, [waveformData.points])

  // Don't render if the waveform is too small to be visible
  if (width < 10 || height < 8) {
    return null
  }

  return (
    <div 
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ 
        width: width,
        height: height,
        opacity: 0.8
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={waveformData.viewBox}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        {/* Background fill for better visibility */}
        <defs>
          <linearGradient id={`waveform-gradient-${cue.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={waveformData.color} stopOpacity="0.3" />
            <stop offset="50%" stopColor={waveformData.color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={waveformData.color} stopOpacity="0.3" />
          </linearGradient>
        </defs>
        
        {/* Waveform path */}
        <path
          d={pathData}
          stroke={waveformData.color}
          strokeWidth={Math.max(0.5, Math.min(2, width / 100))}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        
        {/* Fill area under the curve for better visibility */}
        {pathData && (
          <path
            d={`${pathData} L ${width} ${height / 2} L 0 ${height / 2} Z`}
            fill={`url(#waveform-gradient-${cue.id})`}
            opacity="0.4"
          />
        )}
      </svg>
    </div>
  )
}

// Lightweight version for very small cues
export function MiniWaveformDisplay({
  cue,
  width,
  height,
  className = ''
}: Omit<WaveformDisplayProps, 'zoomLevel'>) {
  // Simplified waveform for small cues
  const simplePattern = useMemo(() => {
    const bars = Math.max(3, Math.min(8, Math.floor(width / 4)))
    const elements = []
    
    for (let i = 0; i < bars; i++) {
      const x = (i / (bars - 1)) * width
      let barHeight = height * 0.3
      
      // Simple pattern based on cue type
      switch (cue.type) {
        case 'rumble_low':
        case 'rumble_high':
          barHeight = height * (0.2 + 0.2 * Math.sin(i * Math.PI / 2))
          break
        case 'kick_soft':
        case 'kick_hard':
          barHeight = i === 1 ? height * 0.6 : height * 0.1
          break
        case 'heartbeat_slow':
        case 'heartbeat_fast':
          barHeight = (i % 3 === 1 || i % 3 === 2) ? height * 0.5 : height * 0.1
          break
        case 'pulse':
          barHeight = i % 2 === 0 ? height * 0.5 : height * 0.1
          break
        case 'explosion':
          barHeight = height * (0.6 * Math.exp(-i * 0.5))
          break
        case 'ramp_up':
          barHeight = height * (0.1 + 0.4 * (i / (bars - 1)))
          break
        case 'ramp_down':
          barHeight = height * (0.5 - 0.4 * (i / (bars - 1)))
          break
        default:
          barHeight = height * 0.3
      }
      
      elements.push(
        <rect
          key={i}
          x={x - 0.5}
          y={height / 2 - barHeight / 2}
          width={1}
          height={barHeight}
          fill="currentColor"
          opacity="0.6"
        />
      )
    }
    
    return elements
  }, [cue.type, width, height])

  if (width < 6 || height < 6) {
    return null
  }

  return (
    <div 
      className={`absolute inset-0 pointer-events-none text-white ${className}`}
      style={{ 
        width: width,
        height: height,
        opacity: 0.7
      }}
    >
      <svg width={width} height={height} className="w-full h-full">
        {simplePattern}
      </svg>
    </div>
  )
}
