import { useEffect, useRef, useState } from 'react';

type CameraStatus = 'requesting' | 'active' | 'error';

const ANALYSIS_DELAY_MS = 1800;

// Placeholder for real cover recognition — this repo has no on-device or
// cloud vision model wired up, so the "photograph the cover, match it to a
// book" step is simulated with a timer and a canned result. Swap this for a
// real vision/OCR API when one exists; everything downstream (resolving the
// recognized title/author to an ISBN and checking the catalogue) is real.
const MOCK_COVER_MATCHES = [
  { title: 'Where the Wild Things Are', author: 'Maurice Sendak' },
  { title: 'Matilda', author: 'Roald Dahl' },
  { title: 'The Very Hungry Caterpillar', author: 'Eric Carle' },
];

function simulateCoverAnalysis(): Promise<{ title: string; author: string } | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const recognized = Math.random() < 0.7;
      if (!recognized) {
        resolve(null);
        return;
      }
      resolve(MOCK_COVER_MATCHES[Math.floor(Math.random() * MOCK_COVER_MATCHES.length)]);
    }, ANALYSIS_DELAY_MS);
  });
}

type Props = {
  onRecognized: (title: string, author: string) => void;
  onNotRecognized: () => void;
  onClose: () => void;
};

export default function ScanCoverPage({ onRecognized, onNotRecognized, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('requesting');
  const analyzingRef = useRef(false);

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
    if (cameraStatus !== 'active' || analyzingRef.current) return;
    analyzingRef.current = true;

    simulateCoverAnalysis().then((match) => {
      if (match) {
        onRecognized(match.title, match.author);
      } else {
        onNotRecognized();
      }
    });
    // A fresh mount (the caller re-renders this component to retry via
    // "Try Scanning Cover Again") is how this analysis re-runs — it isn't
    // meant to repeat while a single mount stays on 'active'.
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
          {cameraStatus === 'active'
            ? 'Analysing the cover…'
            : "Hold the book's front cover steady in front of the camera to scan it."}
        </p>
      </div>
    </div>
  );
}
