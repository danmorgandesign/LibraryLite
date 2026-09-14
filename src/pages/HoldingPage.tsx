import AuthHeader from '../components/layout/AuthHeader';

// Temporary stand-in for LandingPage while registration email is broken
// (Supabase custom SMTP mid-setup, signups currently 500ing). Swap the "/"
// route in App.tsx back to LandingPage once that's confirmed fixed — nothing
// else references this file, so removing it later is a clean delete.
export default function HoldingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AuthHeader navItems={[]} />

      <main className="flex flex-1 items-center justify-center overflow-y-auto px-lg pb-2xl pt-2xl">
        <div className="w-full max-w-xl rounded-md border border-line bg-surface p-2xl text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-ink-primary">We'll be back shortly</h1>
          <p className="mt-md text-sm text-ink-muted">
            Library Lite is undergoing some quick maintenance. Thanks for your patience — check back soon.
          </p>
        </div>
      </main>
    </div>
  );
}
