import Header from '../components/layout/Header';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="flex min-h-screen items-center justify-center px-lg">
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center rounded-sm bg-accent px-lg py-sm text-base font-medium text-ink-primary transition-opacity hover:opacity-90"
        >
          Scan a Book to get Started
        </button>
      </main>
    </div>
  );
}
