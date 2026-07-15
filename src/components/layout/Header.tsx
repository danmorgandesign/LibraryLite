type HeaderProps = {
  /** Highlights this nav item as the current page. */
  activeItem?: 'books' | 'classes';
  /** Books has a real destination now; Classes doesn't exist yet so stays inert. */
  onBooksClick?: () => void;
  /** When provided, renders the "Scan a Book" pill CTA (matches the Figma nav
   * convention for screens other than the landing page, which has its own
   * full-size hero CTA instead). */
  onScan?: () => void;
};

export default function Header({ activeItem, onBooksClick, onScan }: HeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-md px-lg py-md lg:flex-nowrap lg:justify-between">
        <a href="/" className="shrink-0 font-sans text-2xl font-bold tracking-tight text-ink-primary lg:text-3xl">
          Library Lite
        </a>

        <div className="order-3 w-full lg:order-2 lg:w-auto lg:max-w-sm lg:flex-1 lg:px-xl">
          <label htmlFor="book-search" className="sr-only">
            Search books
          </label>
          <input
            id="book-search"
            type="search"
            placeholder="Search books…"
            className="w-full rounded-md border border-line bg-surface px-md py-xs text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
          />
        </div>

        <nav aria-label="Primary" className="order-2 ml-auto flex shrink-0 items-center gap-xl lg:order-3 lg:ml-0">
          {/* Classes has no page yet, so it stays a non-functional button */}
          <button
            type="button"
            onClick={onBooksClick}
            aria-current={activeItem === 'books' ? 'page' : undefined}
            className={`inline-flex min-h-[44px] items-center rounded-sm px-sm text-sm font-medium transition-colors hover:bg-surface-subtle hover:text-ink-primary ${
              activeItem === 'books' ? 'text-ink-primary' : 'text-ink-muted'
            }`}
          >
            Books
          </button>
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center rounded-sm px-sm text-sm font-medium text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink-primary"
          >
            Classes
          </button>
          {onScan && (
            <button
              type="button"
              onClick={onScan}
              className="inline-flex min-h-[44px] items-center rounded-full border border-line bg-surface px-lg text-sm font-medium text-ink-primary transition-opacity hover:opacity-80"
            >
              Scan a Book
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
