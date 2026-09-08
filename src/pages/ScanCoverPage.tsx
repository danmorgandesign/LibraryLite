import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';

type CameraStatus = 'requesting' | 'active' | 'error';

type AnalyzeCoverResponse = { title: string | null; author: string | null; error?: string };

function captureFrameAsBase64(video: HTMLVideoElement): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  // Strip the "data:image/jpeg;base64," prefix — the Vision API (and our
  // Edge Function) wants the raw base64 payload only.
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1] ?? null;
}

async function analyzeCover(imageBase64: string): Promise<{ title: string; author: string } | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke<AnalyzeCoverResponse>('analyze-cover', {
    body: { imageBase64 },
  });
  if (error || !data || data.error || !data.title) return null;
  return { title: data.title, author: data.author ?? '' };
}

type Props = {
  onRecognized: (title: string, author: string) => void;
  onNotRecognized: () => void;
  onClose: () => void;
};

export default function ScanCoverPage({ onRecognized, onNotRecognized, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('requesting');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        stream = s;
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraStatus('active');
      })
      .catch(() => {
        if (!cancelled) setCameraStatus('error');
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Capturing on a manual tap (rather than an automatic timer) is the whole
  // fix here: a fixed delay forces the same framing/focus window on every
  // book regardless of lighting, glare, or how fast the user can get it
  // steady in frame — the user is a much better judge of "the shot is ready"
  // than any timeout would be.
  const handleCapture = async () => {
    if (!videoRef.current) return;
    setIsAnalyzing(true);
    const frame = captureFrameAsBase64(videoRef.current);
    if (!frame) {
      onNotRecognized();
      return;
    }
    const match = await analyzeCover(frame);
    if (match) {
      onRecognized(match.title, match.author);
    } else {
      onNotRecognized();
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col p-lg">
      <div className="flex w-full shrink-0 justify-end">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-11 items-center justify-center text-xl font-medium text-ink-primary"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-lg">
        <div className="relative flex h-[400px] w-[300px] max-w-full items-start overflow-hidden rounded-md border border-line bg-surface-subtle p-lg">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 size-full object-cover ${cameraStatus === 'active' ? '' : 'hidden'}`}
          />
          {cameraStatus !== 'active' && (
            <p className="text-sm text-ink-muted">
              {cameraStatus === 'error'
                ? 'Camera access is unavailable. Allow camera access in your browser settings to scan books.'
                : 'Requesting camera access…'}
            </p>
          )}
        </div>

        <p className="w-[360px] max-w-full text-center text-base text-ink-muted">
          {isAnalyzing
            ? 'Analysing the cover…'
            : "Frame the book's front cover clearly, then capture when it's in focus."}
        </p>

        {cameraStatus === 'active' && (
          <button
            type="button"
            onClick={handleCapture}
            disabled={isAnalyzing}
            className="inline-flex min-h-[47px] items-center rounded-sm bg-accent px-2xl py-sm text-base font-medium text-ink-primary transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isAnalyzing ? 'Analysing…' : 'Capture Cover'}
          </button>
        )}
      </div>
    </div>
  );
}
