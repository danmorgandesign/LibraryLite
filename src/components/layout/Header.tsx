const navItems = ['Books', 'Classes'];

export default function Header() {
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

        {/* Buttons, not links, until the Books/Classes pages exist to route to */}
        <nav aria-label="Primary" className="order-2 ml-auto flex shrink-0 gap-xl lg:order-3 lg:ml-0">
          {navItems.map((item) => (
            <button
              key={item}
              type="button"
              className="inline-flex min-h-[44px] items-center rounded-sm px-sm text-sm font-medium text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink-primary"
            >
              {item}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
