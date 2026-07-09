import Header from '../components/layout/Header';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 items-center justify-center px-lg py-2xl">
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
