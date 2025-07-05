'use client'

import { useCallback } from 'react'
import { Trash2, Settings } from 'lucide-react'
import { Button } from './ui/button'
import { Slider } from './ui/slider'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { HapticCue, isRampCue, RampHapticCue, StaticHapticCue } from '../lib/types'

interface AdjustmentsPanelProps {
  cue: HapticCue
  onUpdate: (cueId: string, updates: Partial<HapticCue>) => void
  onDelete: (cueId: string) => void
}

export default function AdjustmentsPanel({ cue, onUpdate, onDelete }: AdjustmentsPanelProps) {
  const isRamp = isRampCue(cue)

  // Static cue handlers
  const handleIntensityChange = useCallback((value: number[]) => {
    if (!isRamp) {
      onUpdate(cue.id, { intensity: value[0] } as Partial<StaticHapticCue>)
    }
  }, [cue.id, onUpdate, isRamp])

  const handleSharpnessChange = useCallback((value: number[]) => {
    if (!isRamp) {
      onUpdate(cue.id, { sharpness: value[0] } as Partial<StaticHapticCue>)
    }
  }, [cue.id, onUpdate, isRamp])

  // Ramp cue handlers
  const handleIntensityStartChange = useCallback((value: number[]) => {
    if (isRamp) {
      onUpdate(cue.id, { intensity_start: value[0] } as Partial<RampHapticCue>)
    }
  }, [cue.id, onUpdate, isRamp])

  const handleIntensityEndChange = useCallback((value: number[]) => {
    if (isRamp) {
      onUpdate(cue.id, { intensity_end: value[0] } as Partial<RampHapticCue>)
    }
  }, [cue.id, onUpdate, isRamp])

  const handleSharpnessStartChange = useCallback((value: number[]) => {
    if (isRamp) {
      onUpdate(cue.id, { sharpness_start: value[0] } as Partial<RampHapticCue>)
    }
  }, [cue.id, onUpdate, isRamp])

  const handleSharpnessEndChange = useCallback((value: number[]) => {
    if (isRamp) {
      onUpdate(cue.id, { sharpness_end: value[0] } as Partial<RampHapticCue>)
    }
  }, [cue.id, onUpdate, isRamp])

  const handleDurationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const duration = parseFloat(e.target.value)
    if (!isNaN(duration) && duration > 0) {
      onUpdate(cue.id, { duration })
    }
  }, [cue.id, onUpdate])

  const handleDelete = useCallback(() => {
    onDelete(cue.id)
  }, [cue.id, onDelete])

  return (
    <div className="w-80 bg-card border-l border-border p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Cue Settings</h2>
      </div>

      <div className="space-y-6">
        {/* Cue Type Display */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Cue Type</Label>
          <div className="p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium capitalize">
              {cue.type.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Timing */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start-time" className="text-sm font-medium mb-2 block">
              Start Time (s)
            </Label>
            <Input
              id="start-time"
              type="number"
              value={cue.startTime.toFixed(3)}
              readOnly
              className="bg-muted"
            />
          </div>
          <div>
            <Label htmlFor="duration" className="text-sm font-medium mb-2 block">
              Duration (s)
            </Label>
            <Input
              id="duration"
              type="number"
              value={cue.duration.toFixed(3)}
              onChange={handleDurationChange}
              step="0.001"
              min="0.001"
            />
          </div>
        </div>

        {/* Conditional Controls based on cue type */}
        {isRamp ? (
          <>
            {/* Ramp Intensity Controls */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label className="text-sm font-medium mb-3 block">
                    Intensity Start: {(cue as RampHapticCue).intensity_start.toFixed(2)}
                  </Label>
                  <Slider
                    value={[(cue as RampHapticCue).intensity_start]}
                    max={1}
                    step={0.01}
                    onValueChange={handleIntensityStartChange}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0.0</span>
                    <span>1.0</span>
                  </div>
                </div>
                <button
                  onClick={() => onUpdate(cue.id, { intensity_start: 0.1 })}
                  title="Reset Intensity Start"
                  className="text-muted-foreground hover:text-foreground select-none"
                >
                  ↻
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label className="text-sm font-medium mb-3 block">
                    Intensity End: {(cue as RampHapticCue).intensity_end.toFixed(2)}
                  </Label>
                  <Slider
                    value={[(cue as RampHapticCue).intensity_end]}
                    max={1}
                    step={0.01}
                    onValueChange={handleIntensityEndChange}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0.0</span>
                    <span>1.0</span>
                  </div>
                </div>
                <button
                  onClick={() => onUpdate(cue.id, { intensity_end: 1.0 })}
                  title="Reset Intensity End"
                  className="text-muted-foreground hover:text-foreground select-none"
                >
                  ↻
                </button>
              </div>
            </div>

            {/* Ramp Sharpness Controls */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label className="text-sm font-medium mb-3 block">
                    Sharpness Start: {(cue as RampHapticCue).sharpness_start.toFixed(2)}
                  </Label>
                  <Slider
                    value={[(cue as RampHapticCue).sharpness_start]}
                    max={1}
                    step={0.01}
                    onValueChange={handleSharpnessStartChange}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0.0 (Smooth)</span>
                    <span>1.0 (Sharp)</span>
                  </div>
                </div>
                <button
                  onClick={() => onUpdate(cue.id, { sharpness_start: 0.1 })}
                  title="Reset Sharpness Start"
                  className="text-muted-foreground hover:text-foreground select-none"
                >
                  ↻
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label className="text-sm font-medium mb-3 block">
                    Sharpness End: {(cue as RampHapticCue).sharpness_end.toFixed(2)}
                  </Label>
                  <Slider
                    value={[(cue as RampHapticCue).sharpness_end]}
                    max={1}
                    step={0.01}
                    onValueChange={handleSharpnessEndChange}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0.0 (Smooth)</span>
                    <span>1.0 (Sharp)</span>
                  </div>
                </div>
                <button
                  onClick={() => onUpdate(cue.id, { sharpness_end: 0.7 })}
                  title="Reset Sharpness End"
                  className="text-muted-foreground hover:text-foreground select-none"
                >
                  ↻
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Static Intensity Slider */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-sm font-medium mb-3 block">
                  Intensity: {(cue as StaticHapticCue).intensity.toFixed(2)}
                </Label>
                <Slider
                  value={[(cue as StaticHapticCue).intensity]}
                  max={1}
                  step={0.01}
                  onValueChange={handleIntensityChange}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0.0</span>
                  <span>1.0</span>
                </div>
              </div>
              <button
                onClick={() => onUpdate(cue.id, { intensity: 0.8 })}
                title="Reset Intensity"
                className="text-muted-foreground hover:text-foreground select-none"
              >
                ↻
              </button>
            </div>

            {/* Static Sharpness Slider */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-sm font-medium mb-3 block">
                  Sharpness: {(cue as StaticHapticCue).sharpness.toFixed(2)}
                </Label>
                <Slider
                  value={[(cue as StaticHapticCue).sharpness]}
                  max={1}
                  step={0.01}
                  onValueChange={handleSharpnessChange}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0.0 (Smooth)</span>
                  <span>1.0 (Sharp)</span>
                </div>
              </div>
              <button
                onClick={() => onUpdate(cue.id, { sharpness: 0.5 })}
                title="Reset Sharpness"
                className="text-muted-foreground hover:text-foreground select-none"
              >
                ↻
              </button>
            </div>
          </>
        )}

        {/* Track */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Track</Label>
          <div className="p-3 bg-muted rounded-lg">
            <span className="text-sm">Track {cue.track + 1}</span>
          </div>
        </div>

        {/* Delete Button */}
        <Button
          variant="destructive"
          onClick={handleDelete}
          className="w-full flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Cue
        </Button>
      </div>

      <div className="mt-8 text-xs text-muted-foreground">
        <p className="mb-2">Adjust cue properties using the controls above.</p>
        <p className="mb-2">Duration can also be changed by dragging the cue edges on the timeline.</p>
        {isRamp && (
          <p className="text-orange-400">
            ⚡ Ramp cues dynamically change intensity and sharpness over time.
          </p>
        )}
      </div>
    </div>
  )
}
