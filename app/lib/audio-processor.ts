
export interface AudioWaveformData {
  samples: number[]
  sampleRate: number
  duration: number
  peaks: number[]
  viewBox: string
}

export interface AudioExtractionProgress {
  progress: number
  status: 'extracting' | 'analyzing' | 'complete' | 'error'
  message: string
}

// Extract audio data from video file using Web Audio API
export async function extractAudioFromVideo(
  videoFile: File,
  onProgress?: (progress: AudioExtractionProgress) => void
): Promise<AudioWaveformData> {
  try {
    onProgress?.({
      progress: 0,
      status: 'extracting',
      message: 'Extracting audio from video...'
    })

    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    // Convert video file to array buffer
    const arrayBuffer = await videoFile.arrayBuffer()
    
    onProgress?.({
      progress: 25,
      status: 'analyzing',
      message: 'Decoding audio data...'
    })

    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    onProgress?.({
      progress: 50,
      status: 'analyzing',
      message: 'Processing waveform data...'
    })

    // Extract audio samples (use first channel if stereo)
    const channelData = audioBuffer.getChannelData(0)
    const sampleRate = audioBuffer.sampleRate
    const duration = audioBuffer.duration

    onProgress?.({
      progress: 75,
      status: 'analyzing',
      message: 'Generating waveform visualization...'
    })

    // Generate peaks for visualization (downsampled for performance)
    const targetPeaks = Math.min(2048, Math.floor(duration * 100)) // ~100 peaks per second max
    const peaks = generateAudioPeaks(channelData, targetPeaks)

    onProgress?.({
      progress: 100,
      status: 'complete',
      message: 'Audio waveform ready'
    })

    // Close audio context to free resources
    await audioContext.close()

    return {
      samples: Array.from(channelData),
      sampleRate,
      duration,
      peaks,
      viewBox: `0 0 ${targetPeaks} 100`
    }
  } catch (error) {
    console.error('Audio extraction failed:', error)
    onProgress?.({
      progress: 0,
      status: 'error',
      message: error instanceof Error ? error.message : 'Audio extraction failed'
    })
    throw error
  }
}

// Generate downsampled peaks for efficient waveform visualization
function generateAudioPeaks(samples: Float32Array, targetPeakCount: number): number[] {
  const peaks: number[] = []
  const samplesPerPeak = Math.floor(samples.length / targetPeakCount)
  
  for (let i = 0; i < targetPeakCount; i++) {
    const start = i * samplesPerPeak
    const end = Math.min(start + samplesPerPeak, samples.length)
    
    let max = 0
    for (let j = start; j < end; j++) {
      max = Math.max(max, Math.abs(samples[j]))
    }
    
    peaks.push(max)
  }
  
  return peaks
}

// Extract audio from video element (for already loaded videos)
export async function extractAudioFromVideoElement(
  videoElement: HTMLVideoElement,
  onProgress?: (progress: AudioExtractionProgress) => void
): Promise<AudioWaveformData | null> {
  try {
    if (!videoElement.src) {
      throw new Error('Video element has no source')
    }

    onProgress?.({
      progress: 0,
      status: 'extracting',
      message: 'Extracting audio from video element...'
    })

    // Fetch the video file
    const response = await fetch(videoElement.src)
    const arrayBuffer = await response.arrayBuffer()
    
    // Create a temporary file object
    const blob = new Blob([arrayBuffer], { type: 'video/mp4' })
    const file = new File([blob], 'video.mp4', { type: 'video/mp4' })
    
    // Use the main extraction function
    return await extractAudioFromVideo(file, onProgress)
  } catch (error) {
    console.error('Failed to extract audio from video element:', error)
    onProgress?.({
      progress: 0,
      status: 'error',
      message: error instanceof Error ? error.message : 'Audio extraction failed'
    })
    return null
  }
}

// Generate audio waveform path for SVG rendering
export function generateAudioWaveformPath(
  peaks: number[],
  width: number,
  height: number,
  normalize: boolean = true
): string {
  if (peaks.length === 0) return ''

  // Normalize peaks if requested
  const maxPeak = normalize ? Math.max(...peaks) : 1
  const normalizedPeaks = peaks.map(peak => peak / maxPeak)

  const pointsPerPeak = width / peaks.length
  const centerY = height / 2
  const maxAmplitude = height * 0.4

  let path = ''

  // Create waveform path
  for (let i = 0; i < peaks.length; i++) {
    const x = i * pointsPerPeak
    const amplitude = normalizedPeaks[i] * maxAmplitude
    
    const topY = centerY - amplitude
    const bottomY = centerY + amplitude

    if (i === 0) {
      path += `M ${x} ${centerY}`
    }

    // Draw line to top of waveform
    path += ` L ${x} ${topY}`
  }

  // Complete the waveform by drawing back along the bottom
  for (let i = peaks.length - 1; i >= 0; i--) {
    const x = i * pointsPerPeak
    const amplitude = normalizedPeaks[i] * maxAmplitude
    const bottomY = centerY + amplitude
    
    path += ` L ${x} ${bottomY}`
  }

  path += ' Z' // Close the path

  return path
}

// Get audio analysis for sync purposes
export function analyzeAudioForSync(
  audioData: AudioWaveformData,
  timeRange: { start: number, end: number }
): {
  averageAmplitude: number
  peakAmplitude: number
  peakTimes: number[]
} {
  const startIndex = Math.floor((timeRange.start / audioData.duration) * audioData.peaks.length)
  const endIndex = Math.ceil((timeRange.end / audioData.duration) * audioData.peaks.length)
  
  const relevantPeaks = audioData.peaks.slice(startIndex, endIndex)
  
  if (relevantPeaks.length === 0) {
    return { averageAmplitude: 0, peakAmplitude: 0, peakTimes: [] }
  }

  const averageAmplitude = relevantPeaks.reduce((sum, peak) => sum + peak, 0) / relevantPeaks.length
  const peakAmplitude = Math.max(...relevantPeaks)
  
  // Find significant peaks (above 70% of max)
  const peakThreshold = peakAmplitude * 0.7
  const peakTimes: number[] = []
  
  for (let i = 0; i < relevantPeaks.length; i++) {
    if (relevantPeaks[i] >= peakThreshold) {
      const timeRatio = (startIndex + i) / audioData.peaks.length
      const peakTime = timeRatio * audioData.duration
      peakTimes.push(peakTime)
    }
  }

  return { averageAmplitude, peakAmplitude, peakTimes }
}
