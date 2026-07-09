import { ArrowRight, BookOpen, GraduationCap, RotateCcw, ScanLine, Users } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const overviewCards = [
  { icon: BookOpen, title: 'Catalogue', description: 'Every title, always findable.' },
  { icon: RotateCcw, title: 'Loans', description: 'See who has what, at a glance.' },
  { icon: GraduationCap, title: 'Classes', description: 'Organize loans by class.' },
  { icon: Users, title: 'Volunteers', description: 'Simple enough for anyone to run.' },
];

const steps = [
  {
    icon: ScanLine,
    title: 'Scan',
    description: "Point a tablet at the barcode to pull up the book instantly.",
  },
  {
    icon: BookOpen,
    title: 'Check in or out',
    description: 'Loan it to a class or return it — one tap either way.',
  },
  {
    icon: RotateCcw,
    title: 'Always up to date',
    description: 'The catalogue updates itself, no manual bookkeeping.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero: side-by-side on tablet landscape, stacked on portrait/mobile */}
        <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-2xl px-lg py-2xl lg:grid-cols-[1.1fr_0.9fr] lg:py-[64px]">
          <div className="flex flex-col items-start gap-lg">
            <span className="rounded-pill border border-line bg-surface-subtle px-md py-xs text-sm font-medium text-ink-muted">
              For school libraries
            </span>
            <h1 className="text-4xl font-medium leading-tight text-ink-primary lg:text-5xl">
              Keep every book — and every loan — accounted for.
            </h1>
            <p className="max-w-md text-base text-ink-muted lg:text-lg">
              Scan a barcode to check a book in or out in seconds. No spreadsheets, no sticky
              notes, no guessing who has what.
            </p>
            <div className="flex flex-wrap items-center gap-lg">
              <button
                type="button"
                className="inline-flex min-h-[44px] items-center gap-sm rounded-pill border border-line bg-surface px-xl py-sm text-base font-medium text-ink-primary transition-colors hover:bg-surface-subtle"
              >
                <ScanLine className="h-5 w-5" aria-hidden="true" />
                Scan a Book to Get Started
              </button>
              <button
                type="button"
                className="inline-flex min-h-[44px] items-center gap-xs px-sm text-base font-medium text-ink-muted transition-colors hover:text-ink-primary"
              >
                Browse the catalogue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-md">
            {overviewCards.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex flex-col items-start gap-sm rounded-input border border-line bg-surface-subtle p-lg"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-input bg-surface">
                  <Icon className="h-5 w-5 text-ink-primary" aria-hidden="true" />
                </span>
                <p className="text-base font-medium text-ink-primary">{title}</p>
                <p className="text-sm text-ink-muted">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works: 3-column on tablet landscape, stacked on portrait/mobile */}
        <section className="border-t border-line bg-surface-subtle px-lg py-2xl">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-medium text-ink-primary">How it works</h2>
            <div className="mt-xl grid grid-cols-1 gap-xl lg:grid-cols-3">
              {steps.map(({ icon: Icon, title, description }, index) => (
                <div
                  key={title}
                  className="flex flex-col items-start gap-sm rounded-input border border-line bg-surface p-lg"
                >
                  <div className="flex items-center gap-sm">
                    <span className="flex h-10 w-10 items-center justify-center rounded-pill bg-surface-subtle text-sm font-medium text-ink-primary">
                      {index + 1}
                    </span>
                    <Icon className="h-5 w-5 text-ink-primary" aria-hidden="true" />
                  </div>
                  <p className="text-lg font-medium text-ink-primary">{title}</p>
                  <p className="text-sm text-ink-muted">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
