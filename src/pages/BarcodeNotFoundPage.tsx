type Props = {
  barcode: string;
  onEnterDetails: () => void;
  onScanAnother: () => void;
  onCancel: () => void;
};

export default function BarcodeNotFoundPage({ barcode, onEnterDetails, onScanAnother, onCancel }: Props) {
  return (
    <div className="fixed inset-0 flex flex-col overflow-y-auto p-lg lg:flex-row lg:items-start lg:gap-lg lg:overflow-hidden">
      <p className="shrink-0 text-lg font-medium text-ink-primary lg:hidden">Result — Barcode Not Found</p>

      <div className="mt-md flex aspect-[688/420] w-full shrink-0 items-start overflow-hidden rounded-md border border-line bg-surface-subtle lg:mt-0 lg:aspect-auto lg:h-[420px] lg:w-[300px]">
        <p className="p-lg text-sm text-ink-muted">No match found</p>
      </div>

      <div className="flex flex-1 flex-col">
        <span className="mt-lg inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50 px-md py-xs text-xs font-medium text-amber-800 lg:mt-0">
          BARCODE NOT FOUND
        </span>

        <h1 className="mt-lg text-2xl font-semibold text-ink-primary">We couldn&rsquo;t find this book</h1>
        <p className="mt-sm text-base text-ink-muted">
          No details were found for barcode {barcode}. You can enter the title and author manually.
        </p>

        <div className="mt-auto flex shrink-0 flex-col gap-xs pt-xl">
          <button
            type="button"
            onClick={onEnterDetails}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-sm bg-accent px-lg py-sm text-base font-medium text-ink-primary transition-opacity hover:opacity-90"
          >
            Enter Details Manually
          </button>
          <button
            type="button"
            onClick={onScanAnother}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-sm border border-line bg-white px-lg py-sm text-base font-medium text-ink-primary"
          >
            Try Scanning Again
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-[44px] w-full items-center justify-center text-sm font-medium text-ink-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
