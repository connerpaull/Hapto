
'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { Play, Pause, Volume2, SkipBack, SkipForward } from 'lucide-react'
import { Button } from './ui/button'
import { Slider } from './ui/slider'

interface VideoPlayerProps {
  src: string
  currentTime: number
  isPlaying: boolean
  frameRate: number
  onLoad: (video: HTMLVideoElement) => void
  onTimeUpdate: (time: number) => void
  onPlayStateChange: (playing: boolean) => void
  onTimeSeek: (time: number) => void
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src, currentTime, isPlaying, frameRate, onLoad, onTimeUpdate, onPlayStateChange, onTimeSeek }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const volumeRef = useRef(0.8)

    useImperativeHandle(ref, () => videoRef.current!)

    useEffect(() => {
      const video = videoRef.current
      if (!video) return

      const handleLoadedMetadata = () => {
        onLoad(video)
      }

      const handleTimeUpdate = () => {
        onTimeUpdate(video.currentTime)
      }

      const handlePlay = () => {
        onPlayStateChange(true)
      }

      const handlePause = () => {
        onPlayStateChange(false)
      }

      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      video.addEventListener('timeupdate', handleTimeUpdate)
      video.addEventListener('play', handlePlay)
      video.addEventListener('pause', handlePause)

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        video.removeEventListener('timeupdate', handleTimeUpdate)
        video.removeEventListener('play', handlePlay)
        video.removeEventListener('pause', handlePause)
      }
    }, [onLoad, onTimeUpdate, onPlayStateChange])

    const handlePlayPause = () => {
      const video = videoRef.current
      if (!video) return

      if (isPlaying) {
        video.pause()
      } else {
        video.play()
      }
    }

    const handleVolumeChange = (value: number[]) => {
      const video = videoRef.current
      if (!video) return

      volumeRef.current = value[0]
      video.volume = value[0]
    }

    const handlePreviousFrame = () => {
      const video = videoRef.current
      if (!video) return

      const frameDuration = 1 / frameRate
      const newTime = Math.max(0, currentTime - frameDuration)
      video.currentTime = newTime
      onTimeSeek(newTime)
    }

    const handleNextFrame = () => {
      const video = videoRef.current
      if (!video) return

      const frameDuration = 1 / frameRate
      const newTime = Math.min(video.duration || 0, currentTime + frameDuration)
      video.currentTime = newTime
      onTimeSeek(newTime)
    }

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      const frames = Math.floor((seconds % 1) * 30)
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames}`
    }

    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          src={src}
          className="max-w-full max-h-full"
          preload="metadata"
        />
        
        {/* Video Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 video-controls p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayPause}
              className="text-white hover:text-primary"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            
            {/* Frame Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousFrame}
                className="text-white hover:text-primary p-1"
                title="Previous Frame (◀|)"
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextFrame}
                className="text-white hover:text-primary p-1"
                title="Next Frame (|▶)"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="text-sm text-white font-mono">
              {formatTime(currentTime)} / {formatTime(videoRef.current?.duration || 0)}
            </div>
            
            <div className="flex items-center gap-2 ml-auto">
              <Volume2 className="w-4 h-4 text-white" />
              <div className="w-20">
                <Slider
                  value={[volumeRef.current]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

VideoPlayer.displayName = 'VideoPlayer'

export default VideoPlayer
