import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthHeader from '../components/layout/AuthHeader';

export default function RegisterYourselfPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const schoolName = (location.state as { schoolName?: string } | null)?.schoolName;

  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');

  const canSubmit = contactName.trim() && email.trim();

  return (
    <>
      <AuthHeader navItems={[{ label: 'About Us', to: '/' }, { label: 'Login', to: '/login' }]} />

      <main className="flex min-h-screen items-center justify-center px-lg pb-2xl pt-2xl">
        <form
          className="w-full max-w-xl rounded-md border border-line bg-surface p-2xl shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            // Payment (payer details / payment details / order review /
            // confirmation) is deliberately skipped here — straight through
            // to admin onboarding once the account holder's own details are
            // in.
            navigate('/admin-onboarding', { state: { schoolName, contactName: contactName.trim() } });
          }}
        >
          <h1 className="text-2xl font-semibold text-ink-primary">Register Yourself</h1>
          <p className="mt-xs text-sm text-ink-muted">Tell us about your school</p>

          <div className="mt-lg flex flex-col gap-md">
            <label className="flex items-center gap-md">
              <span className="w-[190px] shrink-0 text-sm font-medium text-ink-primary">
                Contact Name <span className="text-red-600">*</span>
              </span>
              <input
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Jeff Pickle"
                className="min-h-[48px] w-full rounded-md border border-line bg-surface-subtle px-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
              />
            </label>
            <label className="flex items-center gap-md">
              <span className="w-[190px] shrink-0 text-sm font-medium text-ink-primary">
                Email <span className="text-red-600">*</span>
              </span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. name@yourschool.co.uk"
                className="min-h-[48px] w-full rounded-md border border-line bg-surface-subtle px-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-xl inline-flex min-h-[44px] w-full items-center justify-center rounded-sm bg-accent px-lg py-sm text-base font-medium text-ink-primary transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Next
          </button>
        </form>
      </main>
    </>
  );
}
