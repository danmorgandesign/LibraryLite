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
    <div className="fixed inset-0 flex flex-col overflow-y-auto p-lg lg:flex-row lg:items-start lg:gap-lg lg:overflow-hidden">
      <p className="shrink-0 text-lg font-medium text-ink-primary lg:hidden">Result — Not in Catalogue</p>

      <div className="mt-md aspect-[688/420] w-full shrink-0 overflow-hidden rounded-md border border-line bg-surface-subtle lg:mt-0 lg:aspect-auto lg:h-[420px] lg:w-[300px]">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="size-full object-cover" />
        ) : (
          <p className="p-lg text-sm text-ink-muted">Book cover</p>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <span className="mt-lg inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50 px-md py-xs text-xs font-medium text-amber-800 lg:mt-0">
          NOT IN CATALOGUE
        </span>

        <h1 className="mt-lg text-2xl font-semibold text-ink-primary">{title ?? 'Unknown book'}</h1>

        <p className="mt-sm text-base text-ink-muted">
          {title
            ? `${author ? `${author} · ` : ''}Found via lookup, not yet in your catalogue.`
            : `Barcode ${barcode} isn’t a known book yet.`}
        </p>

        <div className="mt-auto flex shrink-0 flex-col gap-xs pt-xl">
          <button
            type="button"
            onClick={onAddToCatalogue}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-sm bg-accent px-lg py-sm text-base font-medium text-ink-primary transition-opacity hover:opacity-90"
          >
            Add to catalogue
          </button>
          <button
            type="button"
            onClick={onNotNow}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-sm border border-line bg-white px-lg py-sm text-base font-medium text-ink-primary"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
