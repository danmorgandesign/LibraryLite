import { useRef } from 'react';
import { Link } from 'react-router-dom';
import AuthHeader from '../components/layout/AuthHeader';

const ANSWERS = [
  {
    tag: 'WHAT',
    title: 'What is it?',
    body: 'A simple book-loan tracker: scan a barcode, pick a student, done. No catalogue software to learn.',
  },
  {
    tag: 'WHO',
    title: "Who's it for?",
    body: 'School librarians and teachers running a classroom or school library, without a dedicated IT budget.',
  },
  {
    tag: 'WHERE',
    title: 'Where does it run?',
    body: 'In the browser, on any tablet at your check-out desk — point the camera at a barcode to scan.',
  },
  {
    tag: 'WHY',
    title: 'Why Library Lite?',
    body: "Because tracking who has which book shouldn't need enterprise library software.",
  },
];

export default function LandingPage() {
  const pricingRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <AuthHeader
        navItems={[
          { label: 'Pricing', onClick: () => pricingRef.current?.scrollIntoView({ behavior: 'smooth' }) },
          { label: 'Login', to: '/login' },
          { label: 'Register School', to: '/register-school', variant: 'cta' },
        ]}
      />

      <main className="min-h-screen px-lg pb-2xl pt-[104px] lg:px-2xl">
        <div className="mx-auto max-w-5xl">
          <section className="flex flex-col items-center gap-lg py-2xl text-center">
            <h1 className="max-w-3xl text-4xl font-bold text-ink-primary sm:text-5xl">
              A lighter way to run your school library
            </h1>
            <p className="max-w-xl text-lg text-ink-muted">
              Library Lite is built for teachers and librarians who need to check books in and out — fast, simple, no
              fuss.
            </p>
            <div className="mt-md flex flex-wrap items-center justify-center gap-sm">
              <Link
                to="/register-school"
                className="inline-flex min-h-[44px] items-center rounded-sm bg-accent px-lg py-sm text-base font-medium text-ink-primary transition-opacity hover:opacity-90"
              >
                Register School
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-white px-lg py-sm text-base font-medium text-ink-primary transition-opacity hover:opacity-80"
              >
                Login
              </Link>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-lg py-2xl sm:grid-cols-2 lg:grid-cols-4">
            {ANSWERS.map((answer) => (
              <div key={answer.tag} className="flex flex-col gap-md">
                <span className="inline-flex w-fit items-center rounded-full border border-line bg-surface-subtle px-sm py-xs text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {answer.tag}
                </span>
                <h2 className="text-lg font-semibold text-ink-primary">{answer.title}</h2>
                <p className="text-sm text-ink-muted">{answer.body}</p>
              </div>
            ))}
          </section>

          <section ref={pricingRef} className="flex flex-col items-center gap-md py-2xl text-center">
            <span className="inline-flex w-fit items-center rounded-full border border-line bg-surface-subtle px-sm py-xs text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Pricing
            </span>
            <h2 className="text-2xl font-semibold text-ink-primary sm:text-3xl">Simple, transparent pricing</h2>
            <p className="max-w-md text-base text-ink-muted">
              One flat price for your whole school — no per-seat fees, no surprises.
            </p>

            <div className="mt-lg flex w-full max-w-sm flex-col items-center gap-sm rounded-md border border-line bg-surface p-2xl shadow-sm">
              <p className="flex items-baseline gap-xs">
                <span className="text-4xl font-bold text-ink-primary">£15</span>
                <span className="text-base text-ink-muted">/month</span>
              </p>
              <p className="text-sm text-ink-muted">Billed annually at £180</p>
              <Link
                to="/register-school"
                className="mt-md inline-flex min-h-[44px] w-full items-center justify-center rounded-sm bg-accent px-lg py-sm text-base font-medium text-ink-primary transition-opacity hover:opacity-90"
              >
                Register School
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
