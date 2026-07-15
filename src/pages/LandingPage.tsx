import Header from '../components/layout/Header';

type Props = {
  onScan: () => void;
  onBooksClick: () => void;
};

export default function LandingPage({ onScan, onBooksClick }: Props) {
  return (
    <>
      <Header onBooksClick={onBooksClick} />

      <main className="fixed inset-0 flex items-center justify-center px-lg">
        <button
          type="button"
          onClick={onScan}
          className="inline-flex min-h-[44px] items-center rounded-sm bg-accent px-lg py-sm text-base font-medium text-ink-primary transition-opacity hover:opacity-90"
        >
          Scan a Book to get Started
        </button>
      </main>
    </>
  );
}
