'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const PLACEHOLDER_EXAMPLES = [
  'Hackathon with hacking stations along the walls, sponsor booths in the center, and a ceremony stage at the front',
  '200 person gala with round tables, a dance floor, and a bar on the east wall',
  'Open office with 40 desks, 3 meeting rooms, and a lounge area near the entrance',
  'Assembly line with 3 workstations, a forklift path down the center, and storage in the back',
];

export default function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [useCaseText, setUseCaseText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx(prev => (prev + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Use JPG, PNG, or WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large (max 10MB).');
      return;
    }
    setError(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleSubmit = async () => {
    if (!selectedFile || useCaseText.trim().length < 10) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('floorplan', selectedFile);
      formData.append('useCase', useCaseText);

      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Upload failed');
        setLoading(false);
        return;
      }

      router.push(`/processing/${data.jobId}`);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  const isValid = selectedFile && useCaseText.trim().length >= 10;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Left column — Floor Plan Upload */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Floor Plan Image</h2>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-colors ${
            dragOver
              ? 'border-accent bg-accent/10'
              : preview
                ? 'border-foreground/20'
                : 'border-foreground/20 hover:border-accent'
          }`}
        >
          {preview ? (
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Floor plan preview" className="mx-auto mb-3 max-h-48 rounded-lg object-contain" />
              <p className="text-sm text-foreground/60">{selectedFile?.name} ({((selectedFile?.size ?? 0) / 1024).toFixed(0)} KB)</p>
              <p className="mt-1 text-xs text-foreground/40">Click or drag to replace</p>
            </div>
          ) : (
            <div className="text-center">
              <svg className="mx-auto mb-3 h-12 w-12 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="font-medium">Drop your floor plan here</p>
              <p className="mt-1 text-sm text-foreground/50">or click to browse</p>
              <p className="mt-2 text-xs text-foreground/40">JPG, PNG, or WebP — max 10MB</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
          className="hidden"
        />
      </div>

      {/* Right column — Use Case Input */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">What are you setting up?</h2>
        <textarea
          value={useCaseText}
          onChange={(e) => setUseCaseText(e.target.value)}
          placeholder={PLACEHOLDER_EXAMPLES[placeholderIdx]}
          maxLength={500}
          rows={6}
          className="w-full rounded-2xl border border-foreground/20 bg-foreground/5 p-4 text-foreground placeholder:text-foreground/30 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <div className="mt-2 flex justify-between text-xs text-foreground/40">
          <span>{useCaseText.length < 10 ? `Minimum 10 characters` : ''}</span>
          <span>{useCaseText.length}/500</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="col-span-full rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="col-span-full">
        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="w-full rounded-xl bg-accent px-6 py-4 text-lg font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading...
            </span>
          ) : (
            'Generate My 3D Space \u2192'
          )}
        </button>
      </div>
    </div>
  );
}
