export default function ScanBookPage({ onClose }: { onClose: () => void }) {
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
        <div className="flex h-[249px] w-[560px] max-w-full items-start rounded-md border border-line bg-surface-subtle p-lg">
          <p className="text-sm text-ink-muted">Camera viewfinder</p>
        </div>

        <p className="w-[328px] max-w-full text-center text-base text-ink-muted">
          Point the tablet&rsquo;s camera at a book&rsquo;s barcode to scan it.
        </p>
      </div>
    </div>
  );
}
