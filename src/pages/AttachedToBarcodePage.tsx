type Props = {
  onLoanThisBook: () => void;
  onScanAnotherBook: () => void;
  onHome: () => void;
};

export default function AttachedToBarcodePage({ onLoanThisBook, onScanAnotherBook, onHome }: Props) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-lg p-lg text-center">
      <span className="flex size-[88px] items-center justify-center rounded-full bg-emerald-600 text-white">
        <svg viewBox="0 0 24 24" fill="none" className="size-10">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      <div>
        <h1 className="text-2xl font-semibold text-ink-primary">Attached to barcode</h1>
        <p className="mt-xs text-base text-ink-muted">This book is now linked to the barcode and added to the catalogue.</p>
      </div>

      <div className="mt-md flex w-[328px] max-w-full flex-col gap-xs">
        <button
          type="button"
          onClick={onLoanThisBook}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-sm bg-accent px-lg py-sm text-base font-medium text-ink-primary transition-opacity hover:opacity-90"
        >
          Loan This Book
        </button>
        <button
          type="button"
          onClick={onScanAnotherBook}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-sm border border-line bg-white px-lg py-sm text-base font-medium text-ink-primary"
        >
          Scan Another Book
        </button>
        <button
          type="button"
          onClick={onHome}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-sm border border-line bg-white px-lg py-sm text-base font-medium text-ink-primary"
        >
          Home
        </button>
      </div>
    </div>
  );
}
