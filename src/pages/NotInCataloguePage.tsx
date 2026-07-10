type Props = {
  barcode: string;
  title: string | null;
  author: string | null;
  coverUrl: string | null;
  onAddToCatalogue: () => void;
  onNotNow: () => void;
};

export default function NotInCataloguePage({ barcode, title, author, coverUrl, onAddToCatalogue, onNotNow }: Props) {
  return (
    <div className="fixed inset-0 flex gap-lg p-lg">
      <div className="h-[420px] w-[300px] max-w-[40%] shrink-0 overflow-hidden rounded-md border border-line bg-surface-subtle">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="size-full object-cover" />
        ) : (
          <p className="p-lg text-sm text-ink-muted">Book cover</p>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <span className="inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50 px-md py-xs text-xs font-medium text-amber-800">
          NOT IN CATALOGUE
        </span>

        <h1 className="mt-lg text-2xl font-semibold text-ink-primary">{title ?? 'Unknown book'}</h1>

        <p className="mt-sm text-base text-ink-muted">
          {title
            ? `${author ? `${author} · ` : ''}Found via lookup, not yet in your catalogue.`
            : `Barcode ${barcode} isn’t a known book yet.`}
        </p>

        <div className="mt-auto flex flex-col gap-xs">
          <button
            type="button"
            onClick={onAddToCatalogue}
            className="inline-flex min-h-[44px] items-center justify-center rounded-sm bg-accent px-lg py-sm text-base font-medium text-ink-primary transition-opacity hover:opacity-90"
          >
            Add to catalogue
          </button>
          <button
            type="button"
            onClick={onNotNow}
            className="inline-flex min-h-[44px] items-center justify-center rounded-sm border border-line bg-white px-lg py-sm text-base font-medium text-ink-primary"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
