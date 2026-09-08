import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';

type CameraStatus = 'requesting' | 'active' | 'error';

// Camera auto-exposure/focus needs a moment to settle after the stream
// starts, or the captured frame comes out blurry/washed out — this is also
// what stops the capture from firing the instant the preview appears.
const CAPTURE_DELAY_MS = 1200;

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
  const capturedRef = useRef(false);

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

  useEffect(() => {
    if (cameraStatus !== 'active' || capturedRef.current) return;
    capturedRef.current = true;

    const timeout = window.setTimeout(async () => {
      setIsAnalyzing(true);
      const frame = videoRef.current ? captureFrameAsBase64(videoRef.current) : null;
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
    }, CAPTURE_DELAY_MS);

    return () => window.clearTimeout(timeout);
    // A fresh mount (the caller re-renders this component to retry via
    // "Try Scanning Cover Again") is how this capture re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraStatus]);

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

      <div className="flex flex-1 flex-col items-center justify-center gap-[64px]">
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
            : "Hold the book's front cover steady in front of the camera to scan it."}
        </p>
      </div>
    </div>
  );
}
