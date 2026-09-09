import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthHeader from '../components/layout/AuthHeader';

export default function RegisterSchoolPage() {
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState('');
  const [postcode, setPostcode] = useState('');

  const canSubmit = schoolName.trim() && postcode.trim();

  return (
    <>
      <AuthHeader navItems={[{ label: 'About Us', to: '/' }, { label: 'Login', to: '/login' }]} />

      <main className="flex min-h-screen items-center justify-center px-lg pb-2xl pt-2xl">
        <form
          className="w-full max-w-xl rounded-md border border-line bg-surface p-2xl shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            navigate('/register-yourself', { state: { schoolName: schoolName.trim() } });
          }}
        >
          <h1 className="text-2xl font-semibold text-ink-primary">Register your school</h1>
          <p className="mt-xs text-sm text-ink-muted">Tell us about your school</p>

          <div className="mt-lg flex flex-col gap-md">
            <label className="flex items-center gap-md">
              <span className="w-[190px] shrink-0 text-sm font-medium text-ink-primary">
                School Name <span className="text-red-600">*</span>
              </span>
              <input
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="e.g. Riverbend Primary School"
                className="min-h-[48px] w-full rounded-md border border-line bg-surface-subtle px-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
              />
            </label>
            <label className="flex items-center gap-md">
              <span className="w-[190px] shrink-0 text-sm font-medium text-ink-primary">
                Postcode <span className="text-red-600">*</span>
              </span>
              <input
                required
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="e.g. SW1A 1AA"
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
