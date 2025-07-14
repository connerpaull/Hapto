'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, Download, Volume2, X } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import HaptoLogo from './hapto-logo'
import VideoUpload from './video-upload'
import VideoPlayer from './video-player'
import Timeline from './timeline'
import CueLibrary from './cue-library'
import AdjustmentsPanel from './adjustments-panel'
import { HapticCue, CueType, StaticHapticCue, RampHapticCue, isRampCue, ExportCue, SelectionState } from '../lib/types'
import { AudioWaveformData, extractAudioFromVideo, AudioExtractionProgress } from '../lib/audio-processor'

export default function HaptoEditor() {
  // --- Your existing state and refs ---
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [cues, setCues] = useState<HapticCue[]>([])
  const [selectedCue, setSelectedCue] = useState<HapticCue | null>(null)
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedCueIds: new Set(),
    marqueeSelection: null
  })
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [frameRate, setFrameRate] = useState(30)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioWaveformData, setAudioWaveformData] = useState<AudioWaveformData | null>(null)
  const [audioExtractionProgress, setAudioExtractionProgress] = useState<AudioExtractionProgress | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // --- NEW: Modal state for Feel Haptics LIVE ---
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false)
  const openLiveModal = () => setIsLiveModalOpen(true)
  const closeLiveModal = () => setIsLiveModalOpen(false)

  const modalOverlayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (modalOverlayRef.current && e.target === modalOverlayRef.current) {
        closeLiveModal()
      }
    }
    if (isLiveModalOpen) {
      document.addEventListener('mousedown', onClickOutside)
    } else {
      document.removeEventListener('mousedown', onClickOutside)
    }
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [isLiveModalOpen])

  // --- Your existing callbacks/handlers (no changes) ---
  const handleVideoUpload = useCallback(async (file: File) => {
    setVideoFile(file)
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    setCues([])
    setSelectedCue(null)
    setAudioWaveformData(null)
    setAudioExtractionProgress(null)
    
    try {
      const audioData = await extractAudioFromVideo(file, (progress) => {
        setAudioExtractionProgress(progress)
      })
      setAudioWaveformData(audioData)
      setAudioExtractionProgress(null)
    } catch (error) {
      console.error('Failed to extract audio:', error)
      setAudioExtractionProgress({
        progress: 0,
        status: 'error',
        message: 'Failed to extract audio waveform'
      })
      setTimeout(() => setAudioExtractionProgress(null), 3000)
    }
  }, [])

  const handleVideoLoad = useCallback((video: HTMLVideoElement) => {
    setDuration(video.duration)
    const detectedFrameRate = video.videoWidth > 1920 ? 60 : video.videoWidth > 1280 ? 30 : 24
    setFrameRate(detectedFrameRate)
  }, [])

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time)
  }, [])

  const handleAddCue = useCallback((type: CueType, startTime: number, targetTrack?: number) => {
    const findAvailableTrack = (time: number, preferredTrack: number = 0): number => {
      for (let track = preferredTrack; track < 8; track++) {
        const hasConflict = cues.some(cue => 
          cue.track === track && 
          time >= cue.startTime && 
          time <= cue.startTime + cue.duration
        )
        if (!hasConflict) return track
      }
      return preferredTrack
    }

    const track = targetTrack !== undefined ? targetTrack : findAvailableTrack(startTime)

    if (type === 'ramp_up' || type === 'ramp_down') {
      const rampDefaults = type === 'ramp_up' 
        ? { 
            intensity_start: 0.1, 
            intensity_end: 1.0, 
            sharpness_start: 0.1, 
            sharpness_end: 0.7 
          }
        : { 
            intensity_start: 1.0, 
            intensity_end: 0.1, 
            sharpness_start: 0.7, 
            sharpness_end: 0.1 
          }
      
      const newRampCue: RampHapticCue = {
        id: Date.now().toString(),
        type,
        startTime,
        duration: 2.0,
        track,
        ...rampDefaults
      }
      
      setCues(prev => [...prev, newRampCue])
    } else {
      const newStaticCue: StaticHapticCue = {
        id: Date.now().toString(),
        type,
        startTime,
        duration: 0.5,
        intensity: 0.8,
        sharpness: 0.5,
        track
      }
      
      setCues(prev => [...prev, newStaticCue])
    }
  }, [cues])

  const handleUpdateCue = useCallback((cueId: string, updates: Partial<HapticCue>) => {
    setCues(prev => prev.map(cue => {
      if (cue.id === cueId) {
        return { ...cue, ...updates } as HapticCue
      }
      return cue
    }))
    if (selectedCue?.id === cueId) {
      setSelectedCue(prev => prev ? { ...prev, ...updates } as HapticCue : null)
    }
  }, [selectedCue])

  const handleDeleteCue = useCallback((cueId: string) => {
    setCues(prev => prev.filter(cue => cue.id !== cueId))
    if (selectedCue?.id === cueId) {
      setSelectedCue(null)
    }
  }, [selectedCue])

  const handleCueSelect = useCallback((cue: HapticCue | null, ctrlKey: boolean = false) => {
    if (!cue) {
      setSelectedCue(null)
      setSelectionState(prev => ({
        ...prev,
        selectedCueIds: new Set()
      }))
      return
    }

    if (ctrlKey) {
      setSelectionState(prev => {
        const newSelectedIds = new Set(prev.selectedCueIds)
        if (newSelectedIds.has(cue.id)) {
          newSelectedIds.delete(cue.id)
          setSelectedCue(newSelectedIds.size > 0 ? cues.find(c => newSelectedIds.has(c.id)) || null : null)
        } else {
          newSelectedIds.add(cue.id)
          setSelectedCue(cue)
        }
        return {
          ...prev,
          selectedCueIds: newSelectedIds
        }
      })
    } else {
      setSelectedCue(cue)
      setSelectionState(prev => ({
        ...prev,
        selectedCueIds: new Set([cue.id])
      }))
    }
  }, [cues])

  const handleDeleteSelectedCues = useCallback(() => {
    const idsToDelete = selectionState.selectedCueIds
    if (idsToDelete.size === 0) return

    setCues(prev => prev.filter(cue => !idsToDelete.has(cue.id)))
    setSelectedCue(null)
    setSelectionState(prev => ({
      ...prev,
      selectedCueIds: new Set()
    }))
  }, [selectionState.selectedCueIds])

  const handleMarqueeSelection = useCallback((marqueeRect: DOMRect, timelineRect: DOMRect) => {
    const selectedIds = new Set<string>()
    
    cues.forEach(cue => {
      const cueLeft = (cue.startTime / duration) * timelineRect.width
      const cueTop = cue.track * 36 + 40
      const cueWidth = (cue.duration / duration) * timelineRect.width
      const cueHeight = 32

      const cueRect = {
        left: cueLeft,
        top: cueTop,
        right: cueLeft + cueWidth,
        bottom: cueTop + cueHeight
      }

      const intersects = !(
        marqueeRect.right < cueRect.left ||
        marqueeRect.left > cueRect.right ||
        marqueeRect.bottom < cueRect.top ||
        marqueeRect.top > cueRect.bottom
      )

      if (intersects) {
        selectedIds.add(cue.id)
      }
    })

    setSelectionState(prev => ({
      ...prev,
      selectedCueIds: selectedIds
    }))
    
    if (selectedIds.size > 0) {
      const firstSelectedCue = cues.find(c => selectedIds.has(c.id))
      setSelectedCue(firstSelectedCue || null)
    } else {
      setSelectedCue(null)
    }
  }, [cues, duration])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        handleDeleteSelectedCues()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleDeleteSelectedCues])

  const handleExport = useCallback(async () => {
    if (!videoFile) return

    const hapticData = {
      cues: cues.map(cue => {
        const baseCueData = {
          timestamp: cue.startTime,
          duration: cue.duration,
          type: cue.type
        }
        
        if (isRampCue(cue)) {
          return {
            ...baseCueData,
            intensity_start: cue.intensity_start,
            intensity_end: cue.intensity_end,
            sharpness_start: cue.sharpness_start,
            sharpness_end: cue.sharpness_end
          }
        } else {
          return {
            ...baseCueData,
            intensity: cue.intensity,
            sharpness: cue.sharpness
          }
        }
      }) as ExportCue[]
    }

    const metadata = {
      title: videoFile.name.replace(/\.[^/.]+$/, ''),
      description: 'Haptic cue sequence created with Hapto',
      duration: duration,
      video_filename: videoFile.name,
      cue_count: cues.length,
      created_at: new Date().toISOString(),
      version: '1.0.0'
    }

    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      zip.file(videoFile.name, videoFile)
      zip.file('haptics.json', JSON.stringify(hapticData, null, 2))
      zip.file('metadata.json', JSON.stringify(metadata, null, 2))

      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = url
      link.download = `${metadata.title}.hapto`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }, [videoFile, cues, duration])

  // --- JSX return with new button and modal added ---
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Tagline - Centered and Above Header */}
      <div className="w-full text-center py-8">
        <span className="text-4xl md:text-5xl font-extrabold text-white select-none">
          Give your videos some <span className="h-letter-vibrate text-white">feeling</span>
        </span>
      </div>

      {/* NEW: Feel Haptics LIVE button, centered below tagline */}
      <div className="flex justify-center mb-6">
        <Button
          variant="default"
          size="lg"
          onClick={openLiveModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold tracking-wide shadow-lg"
        >
          Feel Haptics LIVE
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <HaptoLogo />
        <div className="flex items-center gap-3">
          {audioExtractionProgress && (
            <div className="flex items-center gap-2">
              <Badge variant={audioExtractionProgress.status === 'error' ? 'destructive' : 'secondary'}>
                <Volume2 className="w-3 h-3 mr-1" />
                {audioExtractionProgress.status === 'complete' ? 'Audio Ready' : 
                 audioExtractionProgress.status === 'error' ? 'Audio Failed' :
                 `${audioExtractionProgress.progress}%`}
              </Badge>
              {audioExtractionProgress.status !== 'error' && audioExtractionProgress.status !== 'complete' && (
                <span className="text-xs text-muted-foreground">
                  {audioExtractionProgress.message}
                </span>
              )}
            </div>
          )}
          
          <Button
            variant="outline"
            onClick={() => document.getElementById('video-upload')?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload New Video
          </Button>
          {videoFile && (
            <Button
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export .hapto
            </Button>
          )}
        </div>
      </div>

      {!videoFile ? (
        <VideoUpload onVideoUpload={handleVideoUpload} />
      ) : (
        <div className="flex h-[calc(100vh-73px)]">
          <CueLibrary onAddCue={handleAddCue} currentTime={currentTime} />

          <div className="flex-1 flex flex-col">
            <div className="h-1/2 bg-card border-b border-border">
              <VideoPlayer
                ref={videoRef}
                src={videoUrl}
                currentTime={currentTime}
                isPlaying={isPlaying}
                frameRate={frameRate}
                onLoad={handleVideoLoad}
                onTimeUpdate={handleTimeUpdate}
                onPlayStateChange={setIsPlaying}
                onTimeSeek={(time) => {
                  setCurrentTime(time)
                  if (videoRef.current) {
                    videoRef.current.currentTime = time
                  }
                }}
              />
            </div>

            <div className="h-1/2">
              <Timeline
                duration={duration}
                currentTime={currentTime}
                frameRate={frameRate}
                cues={cues}
                selectedCue={selectedCue}
                selectionState={selectionState}
                audioWaveformData={audioWaveformData}
                onCueSelect={handleCueSelect}
                onCueUpdate={handleUpdateCue}
                onAddCue={handleAddCue}
                onMarqueeSelection={handleMarqueeSelection}
                onTimeSeek={(time) => {
                  setCurrentTime(time)
                  if (videoRef.current) {
                    videoRef.current.currentTime = time
                  }
                }}
              />
            </div>
          </div>

          {selectedCue && (
            <AdjustmentsPanel
              cue={selectedCue}
              onUpdate={handleUpdateCue}
              onDelete={handleDeleteCue}
            />
          )}
        </div>
      )}

      {/* NEW: Modal for Feel Haptics LIVE */}
      {isLiveModalOpen && (
        <div
          ref={modalOverlayRef}
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
        >
          <div className="bg-background rounded-lg max-w-md w-full p-6 relative">
            <button
              onClick={closeLiveModal}
              className="absolute top-3 right-3 text-muted-foreground hover:text-white"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold mb-4 text-white">Feel Haptics LIVE</h2>
            <p className="mb-4 text-white">
              Connect your iPhone running the Hapto Player app to your computer and feel the haptics you've added to your video in real time.
            </p>
            <p className="mb-4 text-white">
              Download the Hapto Player app on your iPhone to get started.
            </p>
            <a
              href="https://apps.apple.com/app/hapto-player/id123456789"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded"
            >
              Download Hapto Player
            </a>
          </div>
        </div>
      )}

    </div>
  )
}
