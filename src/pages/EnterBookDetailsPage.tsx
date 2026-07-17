import { useState } from 'react';

type Props = {
  isSaving: boolean;
  error: string | null;
  onSave: (title: string, author: string) => void;
  onCancel: () => void;
};

export default function EnterBookDetailsPage({ isSaving, error, onSave, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');

  return (
    <div className="fixed inset-0 flex flex-col overflow-y-auto p-lg">
      <form
        className="flex flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) onSave(title.trim(), author.trim());
        }}
      >
        <p className="shrink-0 text-lg font-medium text-ink-primary">Enter Book Details</p>
        <p className="mt-sm text-base text-ink-muted">Enter the title and author to attach to this barcode.</p>

        <div className="mt-lg flex flex-col gap-md">
          <label className="flex flex-col gap-xs">
            <span className="sr-only">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              autoFocus
              required
              className="min-h-[64px] w-full rounded-md border border-line bg-surface-subtle px-md text-base text-ink-primary placeholder:text-ink-muted"
            />
          </label>
          <label className="flex flex-col gap-xs">
            <span className="sr-only">Author</span>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author"
              className="min-h-[64px] w-full rounded-md border border-line bg-surface-subtle px-md text-base text-ink-primary placeholder:text-ink-muted"
            />
          </label>
        </div>

        <div className="mt-auto flex shrink-0 flex-col gap-xs pt-xl">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSaving || !title.trim()}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-sm bg-accent px-lg py-sm text-base font-medium text-ink-primary transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save & Attach to Barcode'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="inline-flex min-h-[44px] w-full items-center justify-center text-sm font-medium text-ink-muted disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
