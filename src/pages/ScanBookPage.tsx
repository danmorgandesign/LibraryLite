import { useEffect, useRef, useState } from 'react';

type CameraStatus = 'requesting' | 'active' | 'error';

export default function ScanBookPage({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<CameraStatus>('requesting');

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
        setStatus('active');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

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

      <div className="flex flex-1 flex-col items-center justify-center gap-[128px]">
        <div className="relative flex h-[249px] w-[560px] max-w-full items-start overflow-hidden rounded-md border border-line bg-surface-subtle p-lg">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 size-full object-cover ${status === 'active' ? '' : 'hidden'}`}
          />
          {status !== 'active' && (
            <p className="text-sm text-ink-muted">
              {status === 'error'
                ? 'Camera access is unavailable. Allow camera access in your browser settings to scan books.'
                : 'Requesting camera access…'}
            </p>
          )}
        </div>

        <p className="w-[328px] max-w-full text-center text-base text-ink-muted">
          Point the tablet&rsquo;s camera at a book&rsquo;s barcode to scan it.
        </p>
      </div>
    </div>
  );
}
