
export type CueType = 
  | 'rumble_low'
  | 'rumble_high'
  | 'kick_soft'
  | 'kick_hard'
  | 'heartbeat_slow'
  | 'heartbeat_fast'  
  | 'pulse'
  | 'explosion'
  | 'ramp_up'
  | 'ramp_down'

// Static cue properties (for regular cues)
export interface StaticCueProperties {
  intensity: number
  sharpness: number
}

// Ramp cue properties (for dynamic ramp cues)
export interface RampCueProperties {
  intensity_start: number
  intensity_end: number
  sharpness_start: number
  sharpness_end: number
}

// Base interface for all cues
export interface BaseCue {
  id: string
  type: CueType
  startTime: number
  duration: number
  track: number
}

// Static haptic cue (backward compatible)
export interface StaticHapticCue extends BaseCue, StaticCueProperties {
  type: Exclude<CueType, 'ramp_up' | 'ramp_down'>
}

// Ramp haptic cue (new functionality)
export interface RampHapticCue extends BaseCue, RampCueProperties {
  type: 'ramp_up' | 'ramp_down'
}

// Union type for all haptic cues
export type HapticCue = StaticHapticCue | RampHapticCue

// Selection state interface
export interface SelectionState {
  selectedCueIds: Set<string>
  marqueeSelection: {
    isActive: boolean
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null
}

// Enhanced timeline interaction types
export type TimelineInteractionMode = 'normal' | 'marquee-selecting' | 'dragging-cue' | 'scrubbing-timeline'

// Drag and drop data structure
export interface DragData {
  type: 'cue-from-library'
  cueType: CueType
}

// Type guards
export function isRampCue(cue: HapticCue): cue is RampHapticCue {
  return cue.type === 'ramp_up' || cue.type === 'ramp_down'
}

export function isStaticCue(cue: HapticCue): cue is StaticHapticCue {
  return !isRampCue(cue)
}

// Export data interfaces for different cue types
export interface StaticExportCue {
  timestamp: number
  duration: number
  type: Exclude<CueType, 'ramp_up' | 'ramp_down'>
  intensity: number
  sharpness: number
}

export interface RampExportCue {
  timestamp: number
  duration: number
  type: 'ramp_up' | 'ramp_down'
  intensity_start: number
  intensity_end: number
  sharpness_start: number
  sharpness_end: number
}

export type ExportCue = StaticExportCue | RampExportCue

export interface ExportData {
  cues: ExportCue[]
}

export interface Metadata {
  title: string
  description: string
  duration: number
  video_filename: string
  cue_count: number
  created_at: string
  version: string
}
