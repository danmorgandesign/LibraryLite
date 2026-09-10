import { useState } from 'react';

type Props = {
  barcode: string;
  title: string | null;
  author: string | null;
  coverUrl: string | null;
  isAdding: boolean;
  error: string | null;
  onAddAndLoan: (title: string, author: string) => void;
  onAddAndScanAnother: (title: string, author: string) => void;
  onCancel: () => void;
};

export default function NotInCataloguePage({
  barcode,
  title: lookedUpTitle,
  author: lookedUpAuthor,
  coverUrl,
  isAdding,
  error,
  onAddAndLoan,
  onAddAndScanAnother,
  onCancel,
}: Props) {
  // Editable, not just displayed — Google Books / Open Library sometimes
  // return a wrong or boxset/marketing title for a given ISBN, and there's
  // no reliable way to detect that automatically (the source catalogue
  // itself is wrong, not our parsing of it). The only ground truth is the
  // copy in the librarian's hand, so let them fix it here before it gets
  // saved into the catalogue rather than locking in bad external data.
  const [title, setTitle] = useState(lookedUpTitle ?? '');
  const [author, setAuthor] = useState(lookedUpAuthor ?? '');

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

        <p className="mt-sm text-sm text-ink-muted">
          {lookedUpTitle
            ? 'Found via lookup — check the title and author look right before adding.'
            : `Barcode ${barcode} isn’t a known book yet — enter its details below.`}
        </p>

        <div className="mt-lg flex flex-col gap-sm">
          <label className="flex flex-col gap-xs">
            <span className="sr-only">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              required
              className="min-h-[56px] w-full rounded-md border border-line bg-surface-subtle px-md text-xl font-semibold text-ink-primary placeholder:text-base placeholder:font-normal placeholder:text-ink-muted"
            />
          </label>
          <label className="flex flex-col gap-xs">
            <span className="sr-only">Author</span>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author"
              className="min-h-[48px] w-full rounded-md border border-line bg-surface-subtle px-md text-base text-ink-primary placeholder:text-ink-muted"
            />
          </label>
        </div>

        <div className="mt-auto flex shrink-0 flex-col gap-xs pt-xl">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={() => onAddAndLoan(title.trim(), author.trim())}
            disabled={isAdding || !title.trim()}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-sm bg-accent px-lg py-sm text-base font-medium text-ink-primary transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isAdding ? 'Adding…' : 'Add & Loan Book'}
          </button>
          <button
            type="button"
            onClick={() => onAddAndScanAnother(title.trim(), author.trim())}
            disabled={isAdding || !title.trim()}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-sm border border-line bg-white px-lg py-sm text-base font-medium text-ink-primary disabled:opacity-60"
          >
            Add & Scan Another
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isAdding}
            className="inline-flex min-h-[44px] w-full items-center justify-center text-sm font-medium text-ink-muted disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
