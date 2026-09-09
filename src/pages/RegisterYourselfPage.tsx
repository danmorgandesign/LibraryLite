import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthHeader from '../components/layout/AuthHeader';
import { getSupabaseClient } from '../lib/supabaseClient';
import { stashPendingSchoolRegistration } from '../lib/auth';

export default function RegisterYourselfPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const schoolName = (location.state as { schoolName?: string } | null)?.schoolName ?? '';

  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const canSubmit = contactName.trim() && email.trim() && password.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) throw signUpError;

      // Payment (payer details / payment details / order review /
      // confirmation) is deliberately skipped here — straight through
      // to admin onboarding once the account holder's own details are
      // in.
      if (data.session) {
        const { error: rpcError } = await supabase.rpc('register_school_and_admin', {
          school_name: schoolName,
          admin_name: contactName.trim(),
        });
        if (rpcError) throw rpcError;
        navigate('/admin-onboarding');
      } else {
        // Email confirmation is on for this project — no session yet.
        // Stash the school/admin name so AuthProvider can finish creating
        // the school automatically once they confirm and log in, instead
        // of asking them to re-enter it.
        stashPendingSchoolRegistration({ schoolName, adminName: contactName.trim() });
        setCheckEmail(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register your account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthHeader navItems={[{ label: 'About Us', to: '/' }, { label: 'Login', to: '/login' }]} />

      <main className="flex min-h-screen items-center justify-center px-lg pb-2xl pt-2xl">
        <form
          className="w-full max-w-xl rounded-md border border-line bg-surface p-2xl shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <h1 className="text-2xl font-semibold text-ink-primary">Register Yourself</h1>
          <p className="mt-xs text-sm text-ink-muted">Tell us about your school</p>

          {checkEmail ? (
            <p className="mt-lg text-sm text-ink-primary">
              We've sent a confirmation link to <span className="font-medium">{email}</span>. Click it, then{' '}
              <button type="button" onClick={() => navigate('/login')} className="font-medium underline-offset-2 hover:underline">
                log in
              </button>{' '}
              to finish setting up {schoolName || 'your school'}.
            </p>
          ) : (
            <>
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
                <label className="flex items-center gap-md">
                  <span className="w-[190px] shrink-0 text-sm font-medium text-ink-primary">
                    Password <span className="text-red-600">*</span>
                  </span>
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="min-h-[48px] w-full rounded-md border border-line bg-surface-subtle px-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
                  />
                </label>
              </div>

              {error && <p className="mt-md text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="mt-xl inline-flex min-h-[44px] w-full items-center justify-center rounded-sm bg-accent px-lg py-sm text-base font-medium text-ink-primary transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isSubmitting ? 'Creating your account…' : 'Next'}
              </button>
            </>
          )}
        </form>
      </main>
    </>
  );
}
