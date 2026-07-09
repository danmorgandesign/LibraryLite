export default function Footer() {
  return (
    <footer className="border-t border-line px-lg py-xl">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-xs text-sm text-ink-muted lg:flex-row lg:justify-between">
        <p>© {new Date().getFullYear()} Library Lite</p>
        <p>Built for school librarians, volunteers, and the students who lose the same book twice a term.</p>
      </div>
    </footer>
  );
}
