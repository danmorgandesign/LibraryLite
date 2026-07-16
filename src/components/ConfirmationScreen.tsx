type Props = {
  heading: string;
  subtitle: string;
  onDone: () => void;
};

export default function ConfirmationScreen({ heading, subtitle, onDone }: Props) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-lg p-lg text-center">
      <span className="flex size-[88px] items-center justify-center rounded-full bg-emerald-600 text-white">
        <svg viewBox="0 0 24 24" fill="none" className="size-10">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      <div>
        <h1 className="text-2xl font-semibold text-ink-primary">{heading}</h1>
        <p className="mt-xs text-base text-ink-muted">{subtitle}</p>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="mt-md inline-flex min-h-[44px] w-[328px] max-w-full items-center justify-center rounded-sm bg-accent px-lg py-sm text-base font-medium text-ink-primary transition-opacity hover:opacity-90"
      >
        Done
      </button>
    </div>
  );
}
