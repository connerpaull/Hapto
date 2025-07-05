
import { CueType, HapticCue, isRampCue, isStaticCue } from './types'

export interface WaveformPoint {
  x: number
  y: number
}

export interface WaveformData {
  points: WaveformPoint[]
  viewBox: string
  color: string
}

// Generate mathematically accurate waveform data based on actual haptic parameters
export function generateWaveformData(
  cue: HapticCue,
  width: number,
  height: number,
  zoomLevel: number = 1
): WaveformData {
  const duration = cue.duration
  const color = getWaveformColor(cue.type)
  
  // Calculate sample points based on duration and zoom level
  // Higher zoom = more detail, longer duration = more samples for smooth curves
  const baseSampleRate = 60 // samples per second at zoom level 1
  const sampleCount = Math.max(32, Math.min(512, Math.floor(duration * baseSampleRate * Math.sqrt(zoomLevel))))
  
  // Generate accurate waveforms based on cue type and actual parameters
  switch (cue.type) {
    case 'rumble_low':
      return generateAccurateRumbleWave(cue, width, height, sampleCount, 2.0, color)
    case 'rumble_high':
      return generateAccurateRumbleWave(cue, width, height, sampleCount, 8.0, color)
    case 'kick_soft':
      return generateAccurateImpactWave(cue, width, height, sampleCount, 'soft', color)
    case 'kick_hard':
      return generateAccurateImpactWave(cue, width, height, sampleCount, 'hard', color)
    case 'heartbeat_slow':
      return generateAccurateHeartbeatWave(cue, width, height, sampleCount, 1.2, color)
    case 'heartbeat_fast':
      return generateAccurateHeartbeatWave(cue, width, height, sampleCount, 0.6, color)
    case 'pulse':
      return generateAccuratePulseWave(cue, width, height, sampleCount, color)
    case 'explosion':
      return generateAccurateExplosionWave(cue, width, height, sampleCount, color)
    case 'ramp_up':
    case 'ramp_down':
      return generateAccurateRampWave(cue, width, height, sampleCount, color)
    default:
      return generateAccurateRumbleWave(cue, width, height, sampleCount, 4.0, color)
  }
}

function getWaveformColor(cueType: CueType): string {
  // Use contrasting colors that are visible against cue backgrounds
  const colors = {
    rumble_low: '#E0E7FF',      // Light blue-white
    rumble_high: '#F3E8FF',     // Light purple-white
    kick_soft: '#F0F9FF',       // Light cyan-white
    kick_hard: '#ECFEFF',       // Light teal-white
    heartbeat_slow: '#FFFBEB',  // Light yellow-white
    heartbeat_fast: '#FFF7ED',  // Light orange-white
    pulse: '#F0FDF4',           // Light green-white
    explosion: '#FEF2F2',       // Light red-white
    ramp_up: '#F8FAFC',         // Light gray-white
    ramp_down: '#F8FAFC'        // Light gray-white
  }
  return colors[cueType] || '#FFFFFF'
}

// Helper function to apply sharpness to curve shape
function applySharpnessFilter(value: number, sharpness: number): number {
  // Sharpness 0 = very smooth/rounded, 1 = very sharp/angular
  const sharpnessClamp = Math.max(0, Math.min(1, sharpness))
  
  // Apply exponential curve based on sharpness
  if (value >= 0) {
    return Math.pow(value, 1 - sharpnessClamp * 0.7)
  } else {
    return -Math.pow(-value, 1 - sharpnessClamp * 0.7)
  }
}

// Accurate rumble wave using actual intensity and sharpness parameters
function generateAccurateRumbleWave(
  cue: HapticCue,
  width: number,
  height: number,
  sampleCount: number,
  baseFrequency: number,
  color: string
): WaveformData {
  const points: WaveformPoint[] = []
  const centerY = height / 2
  const intensity = isStaticCue(cue) ? cue.intensity : (cue.intensity_start + cue.intensity_end) / 2
  const sharpness = isStaticCue(cue) ? cue.sharpness : (cue.sharpness_start + cue.sharpness_end) / 2
  
  // Calculate amplitude based on actual intensity
  const maxAmplitude = height * 0.4
  const amplitude = intensity * maxAmplitude
  
  // Adjust frequency based on duration for realistic rumble
  const cycleCount = Math.max(1, Math.floor(cue.duration * baseFrequency))
  
  for (let i = 0; i < sampleCount; i++) {
    const x = (i / (sampleCount - 1)) * width
    const t = (i / (sampleCount - 1)) * cycleCount * 2 * Math.PI
    
    // Generate sine wave
    let rawValue = Math.sin(t)
    
    // Add harmonics for more realistic rumble (influenced by sharpness)
    const harmonicIntensity = sharpness * 0.3
    rawValue += Math.sin(t * 2) * harmonicIntensity * 0.5
    rawValue += Math.sin(t * 3) * harmonicIntensity * 0.25
    
    // Apply sharpness to the wave shape
    const shapedValue = applySharpnessFilter(rawValue, sharpness)
    
    // Scale by intensity and add slight randomness for realism
    const randomVariation = (Math.random() - 0.5) * 0.05 * intensity
    const y = centerY - (shapedValue * amplitude + randomVariation * amplitude)
    
    points.push({ x, y })
  }
  
  return {
    points,
    viewBox: `0 0 ${width} ${height}`,
    color
  }
}

// Accurate impact wave for kicks using actual parameters
function generateAccurateImpactWave(
  cue: HapticCue,
  width: number,
  height: number,
  sampleCount: number,
  type: 'soft' | 'hard',
  color: string
): WaveformData {
  const points: WaveformPoint[] = []
  const centerY = height / 2
  const intensity = isStaticCue(cue) ? cue.intensity : (cue.intensity_start + cue.intensity_end) / 2
  const sharpness = isStaticCue(cue) ? cue.sharpness : (cue.sharpness_start + cue.sharpness_end) / 2
  
  const maxAmplitude = height * 0.45
  const amplitude = intensity * maxAmplitude
  
  // Peak timing and sharpness characteristics
  const peakPosition = type === 'hard' ? 0.15 : 0.25 // Hard kicks peak faster
  const peakWidth = type === 'hard' ? 0.08 : 0.15 // Hard kicks are narrower
  const decayRate = type === 'hard' ? 12 : 6 // Hard kicks decay faster
  
  for (let i = 0; i < sampleCount; i++) {
    const x = (i / (sampleCount - 1)) * width
    const t = i / (sampleCount - 1)
    
    let y = centerY
    
    if (t <= peakPosition + peakWidth) {
      // Attack phase - build up to peak
      const distFromPeak = Math.abs(t - peakPosition)
      if (distFromPeak <= peakWidth) {
        // Create impact spike with sharpness affecting curve
        const peakFactor = 1 - (distFromPeak / peakWidth)
        let spikeValue = Math.sin(peakFactor * Math.PI * 0.5)
        
        // Apply sharpness - higher sharpness = more angular spike
        spikeValue = applySharpnessFilter(spikeValue, sharpness)
        
        const spikeHeight = spikeValue * amplitude
        y = centerY - spikeHeight
      }
    } else {
      // Decay phase - exponential decay after impact
      const decayTime = t - (peakPosition + peakWidth)
      const decayFactor = Math.exp(-decayTime * decayRate)
      
      // Soft vibration during decay, influenced by sharpness
      const vibrationFreq = 20 * (1 + sharpness)
      const vibration = Math.sin(decayTime * vibrationFreq * 2 * Math.PI) * 0.1
      
      const decayHeight = amplitude * 0.2 * decayFactor * (1 + vibration)
      y = centerY - decayHeight
    }
    
    points.push({ x, y })
  }
  
  return {
    points,
    viewBox: `0 0 ${width} ${height}`,
    color
  }
}

// Accurate heartbeat wave with realistic cardiac rhythm
function generateAccurateHeartbeatWave(
  cue: HapticCue,
  width: number,
  height: number,
  sampleCount: number,
  beatInterval: number,
  color: string
): WaveformData {
  const points: WaveformPoint[] = []
  const centerY = height / 2
  const intensity = isStaticCue(cue) ? cue.intensity : (cue.intensity_start + cue.intensity_end) / 2
  const sharpness = isStaticCue(cue) ? cue.sharpness : (cue.sharpness_start + cue.sharpness_end) / 2
  
  const maxAmplitude = height * 0.4
  const amplitude = intensity * maxAmplitude
  const totalBeats = cue.duration / beatInterval
  
  for (let i = 0; i < sampleCount; i++) {
    const x = (i / (sampleCount - 1)) * width
    const t = (i / (sampleCount - 1)) * totalBeats
    const beatPhase = t % 1
    
    let y = centerY
    
    // Realistic cardiac rhythm: S1 (lub) + S2 (dub)
    if (beatPhase < 0.12) {
      // S1 beat (systolic - stronger)
      const s1Phase = beatPhase / 0.12
      let s1Value = Math.sin(s1Phase * Math.PI)
      s1Value = applySharpnessFilter(s1Value, sharpness)
      y = centerY - s1Value * amplitude * 0.8
    } else if (beatPhase > 0.18 && beatPhase < 0.28) {
      // S2 beat (diastolic - softer)
      const s2Phase = (beatPhase - 0.18) / 0.10
      let s2Value = Math.sin(s2Phase * Math.PI)
      s2Value = applySharpnessFilter(s2Value, sharpness)
      y = centerY - s2Value * amplitude * 0.5
    } else if (beatPhase > 0.28 && beatPhase < 0.35) {
      // Small aftershock from S2
      const afterPhase = (beatPhase - 0.28) / 0.07
      const afterValue = Math.sin(afterPhase * Math.PI) * 0.15
      y = centerY - afterValue * amplitude
    }
    
    points.push({ x, y })
  }
  
  return {
    points,
    viewBox: `0 0 ${width} ${height}`,
    color
  }
}

// Accurate pulse wave with precise timing
function generateAccuratePulseWave(
  cue: HapticCue,
  width: number,
  height: number,
  sampleCount: number,
  color: string
): WaveformData {
  const points: WaveformPoint[] = []
  const centerY = height / 2
  const intensity = isStaticCue(cue) ? cue.intensity : (cue.intensity_start + cue.intensity_end) / 2
  const sharpness = isStaticCue(cue) ? cue.sharpness : (cue.sharpness_start + cue.sharpness_end) / 2
  
  const maxAmplitude = height * 0.4
  const amplitude = intensity * maxAmplitude
  
  // Pulse characteristics based on duration and sharpness
  const pulsesPerSecond = 3 + sharpness * 4 // 3-7 pulses per second based on sharpness
  const totalPulses = cue.duration * pulsesPerSecond
  const dutyCycle = 0.3 + sharpness * 0.3 // 30-60% duty cycle
  
  for (let i = 0; i < sampleCount; i++) {
    const x = (i / (sampleCount - 1)) * width
    const t = (i / (sampleCount - 1)) * totalPulses
    const pulsePhase = t % 1
    
    let y = centerY
    
    if (pulsePhase < dutyCycle) {
      // ON phase - square wave with smoothed edges based on sharpness
      const edgeSmoothing = (1 - sharpness) * 0.1
      let pulseValue = 1
      
      // Smooth edges for low sharpness
      if (pulsePhase < edgeSmoothing) {
        pulseValue = pulsePhase / edgeSmoothing
      } else if (pulsePhase > dutyCycle - edgeSmoothing) {
        pulseValue = (dutyCycle - pulsePhase) / edgeSmoothing
      }
      
      y = centerY - pulseValue * amplitude
    } else {
      // OFF phase - minimal baseline
      y = centerY - amplitude * 0.05
    }
    
    points.push({ x, y })
  }
  
  return {
    points,
    viewBox: `0 0 ${width} ${height}`,
    color
  }
}

// Accurate explosion wave with realistic blast dynamics
function generateAccurateExplosionWave(
  cue: HapticCue,
  width: number,
  height: number,
  sampleCount: number,
  color: string
): WaveformData {
  const points: WaveformPoint[] = []
  const centerY = height / 2
  const intensity = isStaticCue(cue) ? cue.intensity : (cue.intensity_start + cue.intensity_end) / 2
  const sharpness = isStaticCue(cue) ? cue.sharpness : (cue.sharpness_start + cue.sharpness_end) / 2
  
  const maxAmplitude = height * 0.45
  const amplitude = intensity * maxAmplitude
  
  // Explosion characteristics
  const blastDuration = 0.08 + (1 - sharpness) * 0.05 // Sharper = shorter blast
  const decayRate = 4 + sharpness * 8 // Sharper = faster decay
  const aftershockFreq = 15 + sharpness * 20 // Higher frequency aftershocks for sharp explosions
  
  for (let i = 0; i < sampleCount; i++) {
    const x = (i / (sampleCount - 1)) * width
    const t = i / (sampleCount - 1)
    
    let y = centerY
    
    if (t < blastDuration) {
      // Initial blast phase
      const blastPhase = t / blastDuration
      let blastValue = Math.pow(1 - blastPhase, 0.3) // Fast rise, slower fall
      blastValue = applySharpnessFilter(blastValue, sharpness)
      y = centerY - blastValue * amplitude
    } else {
      // Decay phase with aftershocks
      const decayTime = t - blastDuration
      const primaryDecay = Math.exp(-decayTime * decayRate)
      
      // Add aftershock vibrations
      const aftershockPhase = decayTime * aftershockFreq * 2 * Math.PI
      const aftershock = Math.sin(aftershockPhase) * Math.exp(-decayTime * 3) * 0.3
      
      const totalDecay = primaryDecay * (1 + aftershock)
      y = centerY - totalDecay * amplitude * 0.4
    }
    
    points.push({ x, y })
  }
  
  return {
    points,
    viewBox: `0 0 ${width} ${height}`,
    color
  }
}

// Accurate ramp wave with smooth interpolation between start and end parameters
function generateAccurateRampWave(
  cue: HapticCue,
  width: number,
  height: number,
  sampleCount: number,
  color: string
): WaveformData {
  const points: WaveformPoint[] = []
  const centerY = height / 2
  
  if (!isRampCue(cue)) {
    // Fallback for non-ramp cues
    const intensity = isStaticCue(cue) ? cue.intensity : 0.5
    const amplitude = intensity * height * 0.4
    for (let i = 0; i < sampleCount; i++) {
      const x = (i / (sampleCount - 1)) * width
      points.push({ x, y: centerY - amplitude * 0.5 })
    }
  } else {
    // True ramp curve with interpolated intensity and sharpness
    const maxAmplitude = height * 0.45
    
    for (let i = 0; i < sampleCount; i++) {
      const x = (i / (sampleCount - 1)) * width
      const t = i / (sampleCount - 1) // 0 to 1 progress through the ramp
      
      // Interpolate intensity from start to end
      const currentIntensity = cue.intensity_start + (cue.intensity_end - cue.intensity_start) * t
      const currentSharpness = cue.sharpness_start + (cue.sharpness_end - cue.sharpness_start) * t
      
      // Calculate amplitude at this point
      const amplitude = currentIntensity * maxAmplitude
      
      // Create smooth ramp curve with micro-variations for realism
      let rampValue = t // Linear by default
      
      // Apply curve shaping based on current sharpness
      if (currentSharpness > 0.5) {
        // Higher sharpness = more exponential curve
        const sharpnessFactor = (currentSharpness - 0.5) * 2
        rampValue = Math.pow(t, 1 - sharpnessFactor * 0.5)
      } else {
        // Lower sharpness = more logarithmic curve
        const smoothnessFactor = (0.5 - currentSharpness) * 2
        rampValue = 1 - Math.pow(1 - t, 1 + smoothnessFactor * 0.5)
      }
      
      // Add subtle micro-variations based on sharpness for texture
      const microFreq = 25 + currentSharpness * 15
      const microVariation = Math.sin(t * microFreq * 2 * Math.PI) * 0.02 * currentIntensity
      
      // For ramp_down, invert the curve
      if (cue.type === 'ramp_down') {
        rampValue = 1 - rampValue
      }
      
      const y = centerY - (rampValue * amplitude + microVariation * amplitude)
      points.push({ x, y })
    }
  }
  
  return {
    points,
    viewBox: `0 0 ${width} ${height}`,
    color
  }
}



// Convert points to SVG path string
export function pointsToPath(points: WaveformPoint[]): string {
  if (points.length === 0) return ''
  
  let path = `M ${points[0].x} ${points[0].y}`
  
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`
  }
  
  return path
}

// Create a smooth curve using bezier curves
export function pointsToSmoothPath(points: WaveformPoint[]): string {
  if (points.length < 2) return ''
  
  let path = `M ${points[0].x} ${points[0].y}`
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    
    if (i === 1) {
      path += ` Q ${prev.x} ${prev.y} ${(prev.x + curr.x) / 2} ${(prev.y + curr.y) / 2}`
    } else {
      const controlX = prev.x + (curr.x - prev.x) * 0.5
      const controlY = prev.y
      path += ` Q ${controlX} ${controlY} ${curr.x} ${curr.y}`
    }
  }
  
  return path
}
