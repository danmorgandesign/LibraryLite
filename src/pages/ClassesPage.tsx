import Header from '../components/layout/Header';

// Placeholder roster — matches the Figma "10 Classes" card grid until this
// reads from a real `classrooms` table (see BooksPage for the same pattern).
const DUMMY_CLASSES = ['Squirrels', 'Badgers', 'Otters', 'Hedgehogs', 'Kits'];

type Props = {
  onScan: () => void;
  onBooksClick: () => void;
  onManageClass: () => void;
  onViewLoans: () => void;
};

export default function ClassesPage({ onScan, onBooksClick, onManageClass, onViewLoans }: Props) {
  return (
    <>
      <Header activeItem="classes" onScan={onScan} onBooksClick={onBooksClick} />

      <main className="min-h-screen px-lg pb-2xl pt-[104px] lg:px-2xl">
        <div className="mx-auto max-w-5xl">
          <div className="mb-lg flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-ink-primary">Classes</h1>
            {/* Not wired yet — no "add a class" flow exists in code, matching
                the Figma overlay's "flag, don't fake" convention. */}
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80"
            >
              + Add Class
            </button>
          </div>

          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
            {DUMMY_CLASSES.map((name) => (
              <div
                key={name}
                className="flex flex-col gap-md rounded-md border border-line bg-surface p-lg shadow-sm"
              >
                <p className="text-xl font-semibold text-ink-primary">{name}</p>
                <div className="flex flex-wrap gap-sm">
                  <button
                    type="button"
                    onClick={onManageClass}
                    className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80"
                  >
                    Manage Class
                  </button>
                  <button
                    type="button"
                    onClick={onViewLoans}
                    className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80"
                  >
                    View Loans
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
