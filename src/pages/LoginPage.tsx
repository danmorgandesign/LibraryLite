import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthHeader from '../components/layout/AuthHeader';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <>
      <AuthHeader
        navItems={[
          { label: 'About Us', to: '/' },
          { label: 'Login', to: '/login' },
          { label: 'Register Interest', to: '/register-school' },
        ]}
      />

      <main className="flex min-h-screen items-center justify-center px-lg pb-2xl pt-[104px]">
        <form
          className="w-full max-w-xl rounded-md border border-line bg-surface p-2xl shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            // No real auth behind this prototype — any submitted credentials
            // just take you into the app.
            navigate('/dashboard');
          }}
        >
          <h1 className="text-2xl font-semibold text-ink-primary">Log In</h1>
          <p className="mt-xs text-sm text-ink-muted">Welcome back — log in to manage your school's library.</p>

          <div className="mt-lg flex flex-col gap-md">
            <label className="flex flex-col gap-xs">
              <span className="text-sm font-medium text-ink-primary">
                Email Address <span className="text-red-600">*</span>
              </span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@yourschool.co.uk"
                className="min-h-[48px] w-full rounded-md border border-line bg-surface-subtle px-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
              />
            </label>
            <label className="flex flex-col gap-xs">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-primary">
                  Password <span className="text-red-600">*</span>
                </span>
                <span className="text-sm text-ink-muted">Forgot password?</span>
              </div>
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

          <button
            type="submit"
            className="mt-lg inline-flex min-h-[44px] w-full items-center justify-center rounded-sm bg-accent px-lg py-sm text-base font-medium text-ink-primary transition-opacity hover:opacity-90"
          >
            Log In
          </button>

          <div className="mt-lg flex items-center gap-md">
            <div className="h-px flex-1 bg-line" />
            <span className="text-sm text-ink-muted">Or continue with</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <div className="mt-md grid grid-cols-2 gap-md">
            <button
              type="button"
              disabled
              title="Not wired up in this prototype"
              className="inline-flex min-h-[42px] items-center justify-center rounded-sm border border-line bg-white text-sm font-medium text-ink-primary opacity-60"
            >
              Google
            </button>
            <button
              type="button"
              disabled
              title="Not wired up in this prototype"
              className="inline-flex min-h-[42px] items-center justify-center rounded-sm border border-line bg-white text-sm font-medium text-ink-primary opacity-60"
            >
              Microsoft
            </button>
          </div>

          <p className="mt-lg text-center text-sm text-ink-muted">
            Don't have an account?{' '}
            <button type="button" onClick={() => navigate('/register-school')} className="font-medium text-ink-primary underline-offset-2 hover:underline">
              Register Interest
            </button>
          </p>
        </form>
      </main>
    </>
  );
}
