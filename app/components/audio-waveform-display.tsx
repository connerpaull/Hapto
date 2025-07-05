
'use client'

import { useMemo } from 'react'
import { AudioWaveformData, generateAudioWaveformPath } from '../lib/audio-processor'

interface AudioWaveformDisplayProps {
  audioData: AudioWaveformData | null
  width: number
  height: number
  currentTime?: number
  zoomLevel?: number
  timeRange?: { start: number, end: number }
  className?: string
  showProgress?: boolean
}

export default function AudioWaveformDisplay({
  audioData,
  width,
  height,
  currentTime = 0,
  zoomLevel = 1,
  timeRange,
  className = '',
  showProgress = true
}: AudioWaveformDisplayProps) {
  // Calculate visible range based on zoom and time range
  const visibleRange = useMemo(() => {
    if (!audioData) return { start: 0, end: 1 }
    
    if (timeRange) {
      return {
        start: timeRange.start / audioData.duration,
        end: timeRange.end / audioData.duration
      }
    }
    
    return { start: 0, end: 1 }
  }, [audioData, timeRange])

  // Extract visible peaks based on zoom and range
  const visiblePeaks = useMemo(() => {
    if (!audioData) return []
    
    const startIndex = Math.floor(visibleRange.start * audioData.peaks.length)
    const endIndex = Math.ceil(visibleRange.end * audioData.peaks.length)
    
    return audioData.peaks.slice(startIndex, endIndex)
  }, [audioData, visibleRange])

  // Generate waveform path
  const waveformPath = useMemo(() => {
    if (visiblePeaks.length === 0) return ''
    return generateAudioWaveformPath(visiblePeaks, width, height, true)
  }, [visiblePeaks, width, height])

  // Calculate progress indicator position
  const progressPosition = useMemo(() => {
    if (!audioData || !showProgress) return 0
    
    const totalDuration = audioData.duration
    const visibleStart = visibleRange.start * totalDuration
    const visibleEnd = visibleRange.end * totalDuration
    const visibleDuration = visibleEnd - visibleStart
    
    if (currentTime < visibleStart || currentTime > visibleEnd) return -1 // Outside visible range
    
    const relativeTime = currentTime - visibleStart
    return (relativeTime / visibleDuration) * width
  }, [audioData, currentTime, visibleRange, width, showProgress])

  if (!audioData) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted/20 border border-dashed border-muted-foreground/30 ${className}`}
        style={{ width, height }}
      >
        <span className="text-xs text-muted-foreground">No audio waveform</span>
      </div>
    )
  }

  return (
    <div 
      className={`relative bg-slate-900/40 border border-slate-700/50 ${className}`}
      style={{ width, height }}
    >
      {/* Waveform SVG */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        {/* Background grid for better readability */}
        <defs>
          <pattern 
            id="audio-grid" 
            width="20" 
            height="10" 
            patternUnits="userSpaceOnUse"
          >
            <path 
              d="M 20 0 L 0 0 0 10" 
              fill="none" 
              stroke="rgba(100, 116, 139, 0.1)" 
              strokeWidth="0.5"
            />
          </pattern>
          
          {/* Gradient for waveform */}
          <linearGradient id="audio-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#1D4ED8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        
        {/* Background grid */}
        <rect width={width} height={height} fill="url(#audio-grid)" opacity="0.3" />
        
        {/* Center line */}
        <line 
          x1="0" 
          y1={height / 2} 
          x2={width} 
          y2={height / 2} 
          stroke="rgba(100, 116, 139, 0.4)" 
          strokeWidth="1"
          strokeDasharray="2,2"
        />
        
        {/* Main waveform */}
        {waveformPath && (
          <path
            d={waveformPath}
            fill="url(#audio-gradient)"
            stroke="#3B82F6"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        )}
        
        {/* Peak markers for important audio events */}
        {visiblePeaks.map((peak, index) => {
          const peakThreshold = Math.max(...visiblePeaks) * 0.8
          if (peak < peakThreshold) return null
          
          const x = (index / (visiblePeaks.length - 1)) * width
          return (
            <line
              key={index}
              x1={x}
              y1={height * 0.1}
              x2={x}
              y2={height * 0.9}
              stroke="#EF4444"
              strokeWidth="1"
              opacity="0.5"
            />
          )
        })}
      </svg>
      
      {/* Progress indicator */}
      {showProgress && progressPosition >= 0 && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 shadow-lg"
          style={{ left: progressPosition }}
        >
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 w-2 h-2 bg-yellow-400 rounded-full shadow-md" />
        </div>
      )}
      
      {/* Audio info overlay */}
      <div className="absolute top-1 left-2 text-xs text-slate-300 font-mono bg-slate-900/60 px-1 rounded">
        Audio: {audioData.duration.toFixed(1)}s
      </div>
      
      {/* RMS level indicator */}
      <div className="absolute top-1 right-2 text-xs text-slate-300 font-mono bg-slate-900/60 px-1 rounded">
        RMS: {(Math.sqrt(visiblePeaks.reduce((sum, p) => sum + p * p, 0) / visiblePeaks.length) * 100).toFixed(0)}%
      </div>
    </div>
  )
}

// Simplified audio waveform for small displays
export function MiniAudioWaveformDisplay({
  audioData,
  width,
  height,
  currentTime = 0,
  className = ''
}: Pick<AudioWaveformDisplayProps, 'audioData' | 'width' | 'height' | 'currentTime' | 'className'>) {
  const simplifiedPeaks = useMemo(() => {
    if (!audioData) return []
    
    // Downsample for mini display
    const targetBars = Math.min(50, Math.floor(width / 2))
    const peaksPerBar = Math.floor(audioData.peaks.length / targetBars)
    
    const simplified: number[] = []
    for (let i = 0; i < targetBars; i++) {
      const start = i * peaksPerBar
      const end = Math.min(start + peaksPerBar, audioData.peaks.length)
      const max = Math.max(...audioData.peaks.slice(start, end))
      simplified.push(max)
    }
    
    return simplified
  }, [audioData, width])

  const progressPosition = useMemo(() => {
    if (!audioData) return 0
    return (currentTime / audioData.duration) * width
  }, [audioData, currentTime, width])

  if (!audioData) {
    return (
      <div 
        className={`bg-muted/10 border border-dashed border-muted-foreground/20 ${className}`}
        style={{ width, height }}
      />
    )
  }

  return (
    <div 
      className={`relative bg-slate-800/30 border border-slate-600/30 ${className}`}
      style={{ width, height }}
    >
      <svg width={width} height={height} className="w-full h-full">
        {simplifiedPeaks.map((peak, index) => {
          const barWidth = width / simplifiedPeaks.length
          const barHeight = peak * height * 0.8
          const x = index * barWidth
          const y = (height - barHeight) / 2
          
          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={Math.max(1, barWidth - 0.5)}
              height={barHeight}
              fill="#3B82F6"
              opacity="0.7"
            />
          )
        })}
      </svg>
      
      {/* Mini progress indicator */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-yellow-400"
        style={{ left: progressPosition }}
      />
    </div>
  )
}
