import Header from '../components/layout/Header';

type Props = {
  onScan: () => void;
  onBooksClick: () => void;
  onBack: () => void;
};

// Shared placeholder — not personalized per class yet, matching the same
// "one generic destination for every card" limitation as the Figma file's
// Class Loans screen before its loan list was built out.
export default function ClassLoansPage({ onScan, onBooksClick, onBack }: Props) {
  return (
    <>
      <Header activeItem="classes" onScan={onScan} onBooksClick={onBooksClick} />

      <main className="min-h-screen px-lg pb-2xl pt-[104px] lg:px-2xl">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-ink-muted transition-colors hover:text-ink-primary"
          >
            ← Back to Classes
          </button>

          <h1 className="mt-lg text-2xl font-semibold text-ink-primary">Class Loans</h1>
          <p className="mt-xs text-sm text-ink-muted">No loan history to show yet.</p>
        </div>
      </main>
    </>
  );
}
