'use client';

import { useCallback, useState, useRef } from 'react';
import { Upload, MonitorPlay, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface VideoUploaderProps {
  onUpload: (file: File) => void;
  isAnalyzing: boolean;
  progressMessage: string;
  progressPercent: number;
  error: string | null;
}

export function VideoUploader({
  onUpload,
  isAnalyzing,
  progressMessage,
  progressPercent,
  error,
}: VideoUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateAndUpload = (file: File) => {
    setValidationError(null);
    if (!file.type.startsWith('video/')) {
      setValidationError('Please upload a valid video file (.mp4, .mov)');
      return;
    }
    // 20MB limit for client-side processing
    if (file.size > 20 * 1024 * 1024) {
      setValidationError('File too large. Maximum size is 20MB.');
      return;
    }
    onUpload(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        validateAndUpload(e.dataTransfer.files[0]);
      }
    },
    [onUpload]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const displayError = validationError || error;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card
        className={`relative group overflow-hidden transition-all duration-300 ${
          dragActive
            ? 'border-purple-500 bg-purple-500/5'
            : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60'
        } ${isAnalyzing ? 'pointer-events-none' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isAnalyzing && fileInputRef.current?.click()}
      >
        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative flex flex-col items-center justify-center min-h-[320px] p-12 z-10">
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-20 animate-pulse" />
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin relative z-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-white">Analyzing Content</h3>
                <p className="text-zinc-500 text-sm max-w-xs mx-auto">{progressMessage}</p>
              </div>
              {/* Progress bar */}
              <div className="w-full max-w-xs h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full gradient-purple transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <MonitorPlay className="w-8 h-8 text-zinc-400 group-hover:text-purple-400 transition-colors" />
              </div>

              <h3 className="text-xl font-semibold text-white mb-2">Upload Source Video</h3>
              <p className="text-zinc-500 text-center max-w-sm mb-8 text-sm leading-relaxed">
                Drag and drop your file here, or click to browse.
                <br />
                <span className="text-zinc-600">Supports MP4, MOV up to 20MB</span>
              </p>

              <Button 
                type="button"
                className="bg-white text-zinc-950 hover:bg-zinc-200"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Select File
              </Button>
            </>
          )}
        </div>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="video/*"
          onChange={handleChange}
        />
      </Card>

      {displayError && (
        <div className="mt-4 p-4 bg-red-500/5 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm animate-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{displayError}</p>
        </div>
      )}
    </div>
  );
}

