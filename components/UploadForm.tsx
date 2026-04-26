'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Upload, FileImage, Sparkles, AlertTriangle } from 'lucide-react';

const PLACEHOLDER_EXAMPLES = [
  'Hackathon with hacking stations along the walls, sponsor booths in the center, and a ceremony stage at the front',
  '200 person gala with round tables, a dance floor, and a bar on the east wall',
  'Open office with 40 desks, 3 meeting rooms, and a lounge area near the entrance',
  'Assembly line with 3 workstations, a forklift path down the center, and storage in the back',
];

const QUICK_PROMPTS = [
  { label: 'Festival', value: '5,000 person festival with a main stage at the south wall, two food courts on the east side, and clear evacuation lanes along every wall.' },
  { label: 'Hospital', value: 'Emergency triage layout: triage desks at the entrance, 8 patient bays on the right, surgical prep on the left, with a clear stretcher path down the center.' },
  { label: 'Warehouse', value: '40 pallet positions, 4 racking aisles running north–south, two forklift charging stations, and dock doors on the east wall.' },
  { label: 'Office', value: 'Open plan office with 40 hot desks, 3 glass meeting rooms, a quiet zone, and a lounge with a coffee bar near the entrance.' },
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
      setPlaceholderIdx((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3500);
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

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

  const isValid = !!selectedFile && useCaseText.trim().length >= 10;
  const charCount = useCaseText.length;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* ─── Floor plan upload ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="font-sans text-xs font-bold tracking-wider uppercase text-white/70">
            01 / Floor plan
          </span>
          {selectedFile && (
            <span className="font-sans text-xs font-bold tracking-wider uppercase text-white">
              Ready
            </span>
          )}
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-xl p-6 transition-all duration-300 group overflow-hidden ${
            dragOver
              ? 'border border-white/50 bg-white/[0.04]'
              : preview
                ? 'border border-white/25 bg-white/[0.02]'
                : 'border border-dashed border-white/15 hover:border-white/35 hover:bg-white/[0.02]'
          }`}
        >
          <div className="absolute inset-0 grid-bg-fine pointer-events-none opacity-40" />

          {preview ? (
            <div className="relative z-10 text-center w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Floor plan preview"
                className="mx-auto mb-4 max-h-44 rounded-lg object-contain ring-1 ring-white/10"
              />
              <div className="font-sans text-xs font-bold tracking-wide uppercase text-white/80">
                <FileImage className="inline-block w-3 h-3 mr-1.5 -mt-0.5 text-white/60" />
                {selectedFile?.name}
              </div>
              <div className="mt-1 font-sans text-xs font-semibold text-white/50">
                {((selectedFile?.size ?? 0) / 1024).toFixed(0)} KB · click or drag to replace
              </div>
            </div>
          ) : (
            <div className="relative z-10 text-center">
              <div className="mx-auto mb-4 flex w-12 h-12 items-center justify-center rounded-lg border border-white/15 bg-white/[0.03] group-hover:border-white/30 group-hover:bg-white/[0.05] transition-all">
                <Upload className="w-5 h-5 text-white/50 group-hover:text-white/80 transition-colors" />
              </div>
              <p className="font-heading text-lg font-bold tracking-tight text-white">
                Drop a floor plan here
              </p>
              <p className="mt-1 font-sans text-xs font-semibold text-white/60">
                or click to browse
              </p>
              <p className="mt-3 font-sans text-xs font-semibold text-white/45">
                JPG · PNG · WEBP — max 10 MB
              </p>
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

      {/* ─── Use case prompt ───────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="font-sans text-xs font-bold tracking-wider uppercase text-white/70">
            02 / Scene brief
          </span>
          <span
            className={`font-sans text-xs font-bold tracking-wider uppercase ${
              useCaseText.trim().length >= 10 ? 'text-white' : 'text-white/40'
            }`}
          >
            {useCaseText.trim().length >= 10 ? 'Ready' : 'Awaiting'}
          </span>
        </div>

        <div className="relative rounded-xl border border-white/10 bg-white/[0.02] focus-within:border-white/30 focus-within:bg-white/[0.03] transition-all">
          <textarea
            value={useCaseText}
            onChange={(e) => setUseCaseText(e.target.value)}
            placeholder={PLACEHOLDER_EXAMPLES[placeholderIdx]}
            maxLength={500}
            rows={6}
            className="w-full bg-transparent p-4 font-sans text-sm font-medium text-white placeholder:text-white/35 focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 font-sans text-xs font-semibold tracking-wide uppercase">
            <span className={charCount >= 10 ? 'text-white/80' : 'text-white/45'}>
              {charCount < 10 ? `${10 - charCount} more chars needed` : 'Brief looks good'}
            </span>
            <span className="text-white/50">{charCount}/500</span>
          </div>
        </div>

        <div className="mt-3">
          <div className="font-sans text-xs font-bold tracking-wider uppercase text-white/60 mb-2 flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-white/50" />
            Quick prompts
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setUseCaseText(p.value)}
                className="cta-secondary px-3.5 py-1.5 rounded-full font-sans text-xs font-bold tracking-wide uppercase"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Error ─────────────────────────────────────────────── */}
      {error && (
        <div className="col-span-full rounded-xl border border-[#ff3b30]/30 bg-[#ff3b30]/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 text-[#ff3b30] shrink-0" />
          <div>
            <div className="font-sans text-xs font-bold tracking-wider uppercase text-[#ff3b30] mb-1">
              Error
            </div>
            <div className="text-sm font-medium text-white/90">{error}</div>
          </div>
        </div>
      )}

      {/* ─── Submit ────────────────────────────────────────────── */}
      <div className="col-span-full pt-2 border-t border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-5">
          <div className="font-sans text-xs font-bold tracking-wider uppercase text-white/55">
            {isValid ? '03 / Ready to dispatch' : '03 / Awaiting inputs'}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="cta-primary px-7 py-3 rounded-full font-extrabold text-sm tracking-[-0.01em] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] disabled:active:scale-100"
          >
            {loading ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Dispatching
              </>
            ) : (
              <>
                Generate simulation
                <ArrowUpRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
