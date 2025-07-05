
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ZoomIn, ZoomOut, Volume2, VolumeX } from 'lucide-react'
import { Button } from './ui/button'
import { HapticCue, isRampCue, SelectionState, DragData, CueType } from '../lib/types'
import { AudioWaveformData } from '../lib/audio-processor'
import WaveformDisplay, { MiniWaveformDisplay } from './waveform-display'
import AudioWaveformDisplay from './audio-waveform-display'

interface TimelineProps {
  duration: number
  currentTime: number
  frameRate: number
  cues: HapticCue[]
  selectedCue: HapticCue | null
  selectionState: SelectionState
  audioWaveformData: AudioWaveformData | null
  onCueSelect: (cue: HapticCue | null, ctrlKey?: boolean) => void
  onCueUpdate: (cueId: string, updates: Partial<HapticCue>) => void
  onAddCue: (type: CueType, startTime: number, targetTrack?: number) => void
  onMarqueeSelection: (marqueeRect: DOMRect, timelineRect: DOMRect) => void
  onTimeSeek: (time: number) => void
}

const CUE_COLORS = {
  rumble_low: '#8B5CF6',
  rumble_high: '#A855F7',
  kick_soft: '#06B6D4',
  kick_hard: '#0891B2',
  heartbeat_slow: '#F59E0B',
  heartbeat_fast: '#F97316',
  pulse: '#10B981',
  explosion: '#EF4444',
  ramp_up: 'linear-gradient(to right, #374151, #F59E0B)',
  ramp_down: 'linear-gradient(to right, #F59E0B, #374151)'
}

export default function Timeline({
  duration,
  currentTime,
  frameRate,
  cues,
  selectedCue,
  selectionState,
  audioWaveformData,
  onCueSelect,
  onCueUpdate,
  onAddCue,
  onMarqueeSelection,
  onTimeSeek
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const timelineBarRef = useRef<HTMLDivElement>(null)
  const tracksContainerRef = useRef<HTMLDivElement>(null)
  const [zoomLevel, setZoomLevel] = useState(1) // 1 = normal, 2 = 2x zoom, etc.
  const [viewStartTime, setViewStartTime] = useState(0) // Start time of visible portion
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false)
  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize-left' | 'resize-right'
    cueId: string
    startX: number
    startTime: number
    startDuration: number
  } | null>(null)
  const [marqueeState, setMarqueeState] = useState<{
    isActive: boolean
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragOverTrack, setDragOverTrack] = useState<number | null>(null)

  // Calculate visible duration based on zoom
  const visibleDuration = duration / zoomLevel
  
  const timeToPixel = useCallback((time: number) => {
    if (!timelineRef.current || visibleDuration === 0) return 0
    const relativeTime = time - viewStartTime
    return (relativeTime / visibleDuration) * timelineRef.current.offsetWidth
  }, [visibleDuration, viewStartTime])

  const pixelToTime = useCallback((pixel: number) => {
    if (!timelineRef.current || visibleDuration === 0) return 0
    const relativeTime = (pixel / timelineRef.current.offsetWidth) * visibleDuration
    return viewStartTime + relativeTime
  }, [visibleDuration, viewStartTime])

  // Zoom functions
  const handleZoomIn = useCallback(() => {
    const newZoomLevel = Math.min(zoomLevel * 2, 16) // Max 16x zoom
    const centerTime = viewStartTime + visibleDuration / 2
    
    setZoomLevel(newZoomLevel)
    
    // Keep the center time in view when zooming
    const newVisibleDuration = duration / newZoomLevel
    const newViewStartTime = Math.max(0, Math.min(
      duration - newVisibleDuration,
      centerTime - newVisibleDuration / 2
    ))
    setViewStartTime(newViewStartTime)
  }, [zoomLevel, viewStartTime, visibleDuration, duration])

  const handleZoomOut = useCallback(() => {
    const newZoomLevel = Math.max(zoomLevel / 2, 0.25) // Min 0.25x zoom (can see 4x duration)
    setZoomLevel(newZoomLevel)
    
    // Adjust view to keep current playhead visible
    const newVisibleDuration = duration / newZoomLevel
    if (newVisibleDuration >= duration) {
      setViewStartTime(0)
    } else {
      const newViewStartTime = Math.max(0, Math.min(
        duration - newVisibleDuration,
        currentTime - newVisibleDuration / 2
      ))
      setViewStartTime(newViewStartTime)
    }
  }, [zoomLevel, duration, currentTime])

  // Enhanced timeline interaction - only works within timeline bar
  const handleTimelineBarClick = useCallback((e: React.MouseEvent) => {
    if (!timelineBarRef.current || dragState || isDraggingScrubber) return
    
    // Check if click is within the timeline bar (ruler area)
    const timelineBarRect = timelineBarRef.current.getBoundingClientRect()
    const isWithinTimelineBar = (
      e.clientX >= timelineBarRect.left &&
      e.clientX <= timelineBarRect.right &&
      e.clientY >= timelineBarRect.top &&
      e.clientY <= timelineBarRect.bottom
    )
    
    if (!isWithinTimelineBar) return
    
    const x = e.clientX - timelineBarRect.left
    const time = pixelToTime(x)
    onTimeSeek(time)
  }, [pixelToTime, onTimeSeek, dragState, isDraggingScrubber])

  // Drag-to-scrub functionality
  const handleTimelineBarMouseDown = useCallback((e: React.MouseEvent) => {
    if (!timelineBarRef.current || dragState) return
    
    const timelineBarRect = timelineBarRef.current.getBoundingClientRect()
    const isWithinTimelineBar = (
      e.clientX >= timelineBarRect.left &&
      e.clientX <= timelineBarRect.right &&
      e.clientY >= timelineBarRect.top &&
      e.clientY <= timelineBarRect.bottom
    )
    
    if (!isWithinTimelineBar) return
    
    setIsDraggingScrubber(true)
    const x = e.clientX - timelineBarRect.left
    const time = pixelToTime(x)
    onTimeSeek(time)
  }, [pixelToTime, onTimeSeek, dragState])

  const handleCueMouseDown = useCallback((e: React.MouseEvent, cue: HapticCue, type: 'move' | 'resize-left' | 'resize-right') => {
    e.stopPropagation()
    
    // Handle multi-selection with Ctrl/Cmd
    const isCtrlPressed = e.ctrlKey || e.metaKey
    onCueSelect(cue, isCtrlPressed)
    
    setDragState({
      type,
      cueId: cue.id,
      startX: e.clientX,
      startTime: cue.startTime,
      startDuration: cue.duration
    })
  }, [onCueSelect])

  // Drag and Drop handlers for cues from library
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    
    if (!tracksContainerRef.current) return
    
    const rect = tracksContainerRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const track = Math.floor((y - 40) / 36) // Account for audio track height and track spacing
    
    setIsDragOver(true)
    setDragOverTrack(Math.max(0, Math.min(7, track))) // Clamp to valid track range
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!tracksContainerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
      setDragOverTrack(null)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setDragOverTrack(null)
    
    try {
      const dragData: DragData = JSON.parse(e.dataTransfer.getData('application/json'))
      
      if (dragData.type === 'cue-from-library' && tracksContainerRef.current) {
        const rect = tracksContainerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        
        const time = pixelToTime(x)
        const track = Math.floor((y - 40) / 36) // Account for audio track
        const targetTrack = Math.max(0, Math.min(7, track))
        
        onAddCue(dragData.cueType, time, targetTrack)
      }
    } catch (error) {
      console.error('Failed to handle drop:', error)
    }
  }, [onAddCue, pixelToTime])

  // Marquee selection handlers
  const handleTracksMouseDown = useCallback((e: React.MouseEvent) => {
    if (dragState || isDraggingScrubber) return
    
    // Only start marquee selection if clicking in empty space
    const target = e.target as HTMLElement
    if (target.closest('.cue-block') || target.closest('.resize-handle')) return
    
    e.preventDefault()
    
    if (!tracksContainerRef.current) return
    
    const rect = tracksContainerRef.current.getBoundingClientRect()
    const startX = e.clientX - rect.left
    const startY = e.clientY - rect.top
    
    setMarqueeState({
      isActive: true,
      startX,
      startY,
      currentX: startX,
      currentY: startY
    })
    
    // Clear selection if not holding Ctrl/Cmd
    if (!e.ctrlKey && !e.metaKey) {
      onCueSelect(null)
    }
  }, [dragState, isDraggingScrubber, onCueSelect])

  // Handle cue dragging
  useEffect(() => {
    if (!dragState) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startX
      const deltaTime = pixelToTime(deltaX)

      const cue = cues.find(c => c.id === dragState.cueId)
      if (!cue) return

      let updates: Partial<HapticCue> = {}

      switch (dragState.type) {
        case 'move':
          updates.startTime = Math.max(0, Math.min(duration - dragState.startDuration, dragState.startTime + deltaTime))
          break
        case 'resize-left':
          const newStartTime = Math.max(0, dragState.startTime + deltaTime)
          const newDuration = dragState.startDuration - (newStartTime - dragState.startTime)
          if (newDuration > 0.1) {
            updates.startTime = newStartTime
            updates.duration = newDuration
          }
          break
        case 'resize-right':
          const newDurationRight = Math.max(0.1, dragState.startDuration + deltaTime)
          if (dragState.startTime + newDurationRight <= duration) {
            updates.duration = newDurationRight
          }
          break
      }

      if (Object.keys(updates).length > 0) {
        onCueUpdate(dragState.cueId, updates)
      }
    }

    const handleMouseUp = () => {
      setDragState(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, cues, duration, pixelToTime, onCueUpdate])

  // Handle drag-to-scrub
  useEffect(() => {
    if (!isDraggingScrubber) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineBarRef.current) return
      
      const timelineBarRect = timelineBarRef.current.getBoundingClientRect()
      const x = e.clientX - timelineBarRect.left
      const time = Math.max(0, Math.min(duration, pixelToTime(x)))
      onTimeSeek(time)
    }

    const handleMouseUp = () => {
      setIsDraggingScrubber(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingScrubber, pixelToTime, onTimeSeek, duration])

  // Handle marquee selection
  useEffect(() => {
    if (!marqueeState?.isActive) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!tracksContainerRef.current || !marqueeState) return
      
      const rect = tracksContainerRef.current.getBoundingClientRect()
      const currentX = e.clientX - rect.left
      const currentY = e.clientY - rect.top
      
      setMarqueeState(prev => prev ? {
        ...prev,
        currentX,
        currentY
      } : null)
    }

    const handleMouseUp = () => {
      if (!marqueeState || !tracksContainerRef.current) {
        setMarqueeState(null)
        return
      }

      // Calculate final marquee rectangle
      const rect = tracksContainerRef.current.getBoundingClientRect()
      const marqueeRect = new DOMRect(
        Math.min(marqueeState.startX, marqueeState.currentX),
        Math.min(marqueeState.startY, marqueeState.currentY),
        Math.abs(marqueeState.currentX - marqueeState.startX),
        Math.abs(marqueeState.currentY - marqueeState.startY)
      )
      
      // Only process selection if marquee has meaningful size
      if (marqueeRect.width > 5 && marqueeRect.height > 5) {
        onMarqueeSelection(marqueeRect, rect)
      }
      
      setMarqueeState(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [marqueeState, onMarqueeSelection])

  // Handle keyboard shortcuts for zoom (Alt/Option + scroll)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!e.altKey) return
      
      e.preventDefault()
      
      if (e.deltaY < 0) {
        handleZoomIn()
      } else {
        handleZoomOut()
      }
    }

    const timelineElement = timelineRef.current
    if (timelineElement) {
      timelineElement.addEventListener('wheel', handleWheel, { passive: false })
      
      return () => {
        timelineElement.removeEventListener('wheel', handleWheel)
      }
    }
  }, [handleZoomIn, handleZoomOut])

  // Auto-adjust view to keep current playhead visible
  useEffect(() => {
    if (currentTime < viewStartTime || currentTime > viewStartTime + visibleDuration) {
      const newViewStartTime = Math.max(0, Math.min(
        duration - visibleDuration,
        currentTime - visibleDuration / 2
      ))
      setViewStartTime(newViewStartTime)
    }
  }, [currentTime, viewStartTime, visibleDuration, duration])

  const renderTimeRuler = () => {
    const intervals = []
    // Adjust interval based on zoom level for better readability
    let secondInterval = 1
    if (zoomLevel >= 8) secondInterval = 0.25
    else if (zoomLevel >= 4) secondInterval = 0.5
    else if (zoomLevel >= 2) secondInterval = 1
    else if (visibleDuration > 60) secondInterval = 5
    else if (visibleDuration > 20) secondInterval = 2
    else secondInterval = 1
    
    const viewEndTime = viewStartTime + visibleDuration
    const startInterval = Math.floor(viewStartTime / secondInterval) * secondInterval
    
    for (let i = startInterval; i <= viewEndTime; i += secondInterval) {
      if (i < 0) continue
      const position = timeToPixel(i)
      
      // Only render if position is within view
      if (position >= -50 && position <= (timelineRef.current?.offsetWidth || 0) + 50) {
        intervals.push(
          <div
            key={i}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: position }}
          >
            <div className="w-px h-4 bg-border" />
            <span className="text-xs text-muted-foreground mt-1">
              {Math.floor(i / 60)}:{(i % 60).toFixed(secondInterval < 1 ? 2 : 0).padStart(secondInterval < 1 ? 5 : 2, '0')}
            </span>
          </div>
        )
      }
    }
    
    return intervals
  }

  const renderCue = (cue: HapticCue) => {
    const left = timeToPixel(cue.startTime)
    const width = timeToPixel(cue.duration)
    const isSelected = selectedCue?.id === cue.id
    const isMultiSelected = selectionState.selectedCueIds.has(cue.id)
    const isRamp = isRampCue(cue)
    
    // Only render if cue is at least partially visible
    const cueEndTime = cue.startTime + cue.duration
    const viewEndTime = viewStartTime + visibleDuration
    const isVisible = (
      cue.startTime < viewEndTime && 
      cueEndTime > viewStartTime &&
      left > -200 && 
      left < (timelineRef.current?.offsetWidth || 0) + 200
    )
    
    if (!isVisible) return null

    const actualWidth = Math.max(width, 4)
    const cueHeight = 32 // 8 * 4 (h-8 in Tailwind)
    
    // Enhanced selection styling
    const getSelectionStyling = () => {
      if (isSelected) return '0 0 0 2px #3B82F6, 0 0 8px rgba(59, 130, 246, 0.4)' // Blue for primary selection
      if (isMultiSelected) return '0 0 0 2px #F59E0B, 0 0 6px rgba(245, 158, 11, 0.3)' // Orange for multi-selection
      return '0 1px 3px rgba(0,0,0,0.3)'
    }
    
    const cueStyle = isRamp 
      ? {
          left,
          width: actualWidth,
          top: cue.track * 36,
          background: CUE_COLORS[cue.type],
          border: `1px solid ${isSelected || isMultiSelected ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)'}`,
          boxShadow: getSelectionStyling()
        }
      : {
          left,
          width: actualWidth,
          top: cue.track * 36,
          backgroundColor: CUE_COLORS[cue.type],
          border: `1px solid ${isSelected || isMultiSelected ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)'}`,
          boxShadow: getSelectionStyling()
        }

    // Determine which waveform component to use based on size
    const useFullWaveform = actualWidth > 40 && zoomLevel >= 0.5
    const WaveformComponent = useFullWaveform ? WaveformDisplay : MiniWaveformDisplay

    return (
      <div
        key={cue.id}
        className={`cue-block absolute h-8 rounded-sm relative overflow-hidden cursor-move transition-all duration-150 ${
          isSelected ? 'selected z-20' : isMultiSelected ? 'multi-selected z-10' : 'z-0'
        } ${isRamp ? 'ramp-cue' : ''}`}
        style={cueStyle}
        onMouseDown={(e) => handleCueMouseDown(e, cue, 'move')}
      >
        {/* Waveform Background */}
        <WaveformComponent
          cue={cue}
          width={actualWidth}
          height={cueHeight}
          zoomLevel={zoomLevel}
          className="z-0"
        />
        
        {/* Resize Handles */}
        <div
          className="resize-handle left absolute top-0 bottom-0 w-2 left-0 cursor-col-resize bg-white/0 hover:bg-white/20 transition-colors z-30"
          onMouseDown={(e) => handleCueMouseDown(e, cue, 'resize-left')}
        />
        <div
          className="resize-handle right absolute top-0 bottom-0 w-2 right-0 cursor-col-resize bg-white/0 hover:bg-white/20 transition-colors z-30"
          onMouseDown={(e) => handleCueMouseDown(e, cue, 'resize-right')}
        />
        
        {/* Cue Label */}
        <div className="absolute inset-0 px-2 py-1 text-xs text-white truncate z-10 flex items-center pointer-events-none">
          <span className="drop-shadow-sm font-medium">
            {cue.type.replace('_', ' ')}
            {isRamp && (
              <span className="ml-1 text-[10px] opacity-90 font-bold">RAMP</span>
            )}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-card border-r border-border overflow-hidden relative">
      <div className="h-full flex">
        {/* Track Labels Sidebar */}
        <div className="w-24 bg-muted/30 border-r border-border flex-shrink-0">
          <div className="h-16 border-b border-border flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground">TRACKS</span>
          </div>
          
          {/* Audio Track Label */}
          {audioWaveformData && (
            <div className="h-20 border-b border-border flex items-center justify-between px-3 bg-slate-900/10">
              <span className="text-xs font-medium text-muted-foreground">Audio</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAudioMuted(!isAudioMuted)}
                className="h-6 w-6 p-0"
                title={isAudioMuted ? "Unmute Audio" : "Mute Audio"}
              >
                {isAudioMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </Button>
            </div>
          )}
          
          {/* Haptic Track Labels */}
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="h-9 border-b border-border/50 flex items-center px-3"
            >
              <span className="text-xs text-muted-foreground">H{i + 1}</span>
              {dragOverTrack === i && isDragOver && (
                <div className="ml-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* Main Timeline Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Timeline Header with Professional Playhead */}
          <div className="h-16 border-b border-border relative" ref={timelineRef}>
            {/* Timeline Ruler - This is the clickable/draggable area */}
            <div 
              className="timeline-ruler h-full relative cursor-pointer"
              ref={timelineBarRef}
              onClick={handleTimelineBarClick}
              onMouseDown={handleTimelineBarMouseDown}
            >
              {renderTimeRuler()}
              
              {/* Professional Playhead - Triangle marker with vertical line */}
              <div className="absolute top-0 bottom-0 pointer-events-none z-20" style={{ left: timeToPixel(currentTime) }}>
                {/* Triangle marker at top */}
                <div className="absolute top-0 transform -translate-x-1/2">
                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-primary" />
                </div>
                {/* Vertical line */}
                <div className="absolute top-6 bottom-0 w-0.5 bg-primary/80 transform -translate-x-1/2" />
              </div>
            </div>
          </div>

          {/* Audio Waveform Display - Always visible */}
          {audioWaveformData && (
            <div className="h-20 border-b border-border relative bg-slate-900/10">
              <div className="h-full relative">
                <AudioWaveformDisplay
                  audioData={audioWaveformData}
                  width={timelineRef.current?.offsetWidth || 800}
                  height={80}
                  currentTime={currentTime}
                  zoomLevel={zoomLevel}
                  timeRange={{
                    start: viewStartTime,
                    end: viewStartTime + visibleDuration
                  }}
                  showProgress={true}
                  className="rounded-sm"
                />
                {/* Playhead line for audio track */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-primary/60 pointer-events-none z-10"
                  style={{ left: timeToPixel(currentTime) }}
                />
              </div>
            </div>
          )}

          {/* Haptic Timeline Tracks */}
          <div 
            className="flex-1 overflow-hidden relative bg-card"
            ref={tracksContainerRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onMouseDown={handleTracksMouseDown}
          >
            {/* Track Backgrounds with Drop Zones */}
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className={`absolute left-0 right-0 h-9 border-b border-border/30 ${
                  dragOverTrack === i && isDragOver ? 'bg-primary/10 border-primary/50' : 'hover:bg-muted/20'
                }`}
                style={{ top: i * 36 }}
              >
                {/* Drop zone indicator */}
                {dragOverTrack === i && isDragOver && (
                  <div className="absolute inset-1 border-2 border-dashed border-primary/50 rounded bg-primary/5" />
                )}
              </div>
            ))}

            {/* Haptic Cue Blocks */}
            {cues.map(renderCue)}

            {/* Playhead vertical line across all tracks */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-primary/40 pointer-events-none z-5"
              style={{ left: timeToPixel(currentTime) }}
            />

            {/* Marquee Selection Rectangle */}
            {marqueeState?.isActive && (
              <div
                className="absolute border-2 border-primary bg-primary/10 pointer-events-none z-30"
                style={{
                  left: Math.min(marqueeState.startX, marqueeState.currentX),
                  top: Math.min(marqueeState.startY, marqueeState.currentY),
                  width: Math.abs(marqueeState.currentX - marqueeState.startX),
                  height: Math.abs(marqueeState.currentY - marqueeState.startY),
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Repositioned Zoom Controls - Bottom Right */}
      <div className="absolute bottom-4 right-4 flex gap-2 bg-background/90 backdrop-blur-sm p-2 rounded-lg border shadow-lg z-40">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          className="h-8 w-8 p-0"
          title="Zoom Out (Alt + Scroll Down)"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <div className="flex items-center px-2">
          <span className="text-xs text-muted-foreground font-medium">
            {zoomLevel}x
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          className="h-8 w-8 p-0"
          title="Zoom In (Alt + Scroll Up)"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
