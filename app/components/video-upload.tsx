
'use client'

import { useCallback, useState } from 'react'
import { Upload, FileVideo } from 'lucide-react'

interface VideoUploadProps {
  onVideoUpload: (file: File) => void
}

export default function VideoUpload({ onVideoUpload }: VideoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = useCallback((file: File) => {
    if (file.type.startsWith('video/')) {
      onVideoUpload(file)
    }
  }, [onVideoUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div
          className={`drop-zone p-16 text-center ${isDragging ? 'drag-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <FileVideo className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Upload Video File</h2>
          <p className="text-muted-foreground mb-6">
            Drag & drop your MP4 or MOV file here, or click to browse
          </p>
          <label htmlFor="video-upload" className="inline-block">
            <div className="bg-primary text-primary-foreground px-6 py-3 rounded-lg cursor-pointer hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Choose Video File
            </div>
          </label>
          <input
            id="video-upload"
            type="file"
            accept="video/mp4,video/mov,video/quicktime"
            className="hidden"
            onChange={handleFileInput}
          />
          <p className="text-xs text-muted-foreground mt-4">
            Supported formats: MP4, MOV
          </p>
        </div>
      </div>
    </div>
  )
}
