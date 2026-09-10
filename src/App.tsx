import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, RequireAuth } from './lib/auth';
import LandingPage from './pages/LandingPage';
import RegisterSchoolPage from './pages/RegisterSchoolPage';
import RegisterYourselfPage from './pages/RegisterYourselfPage';
import AdminOnboardingPage from './pages/AdminOnboardingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BooksPage from './pages/BooksPage';
import ClassesPage from './pages/ClassesPage';
import ClassLoansPage from './pages/ClassLoansPage';
import ManageClassPage from './pages/ManageClassPage';
import ScanBookPage from './pages/ScanBookPage';
import StudentsPage from './pages/StudentsPage';
import StudentDetailPage from './pages/StudentDetailPage';
import ManageTeachersPage from './pages/ManageTeachersPage';
import ProfilePage from './pages/ProfilePage';
import SchoolPage from './pages/SchoolPage';
import TeacherOnboardingPage from './pages/TeacherOnboardingPage';

// HashRouter (not BrowserRouter) because this app deploys as a static build
// to GitHub Pages — there's no server to rewrite deep links like
// /students/:id back to index.html, and Pages doesn't support that natively.
// Hash routes (/#/students/:id) always resolve to index.html since
// everything after the # is client-side only, so this needs no extra
// redirect config. Worth revisiting if the app ever moves to a host that
// can do SPA rewrites and clean URLs become worth the setup.
export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          {/* Public / pre-auth — no session required */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/register-school" element={<RegisterSchoolPage />} />
          <Route path="/register-yourself" element={<RegisterYourselfPage />} />
          <Route path="/login" element={<LoginPage />} />
          {/* Not signed in yet when a just-invited teacher first lands here
              (they sign up as part of this page), so it can't sit behind
              RequireAuth like the rest of "inside the app" does. */}
          <Route path="/teacher-onboarding" element={<TeacherOnboardingPage />} />

          {/* Inside the app — requires a real session, and a completed
              admin/teacher onboarding (RequireAuth redirects to
              /teacher-onboarding otherwise). admin-onboarding moved in here
              since it now reads the signed-in admin from context instead of
              router state. */}
          <Route
            path="/admin-onboarding"
            element={
              <RequireAuth>
                <AdminOnboardingPage />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/scan"
            element={
              <RequireAuth>
                <ScanBookPage />
              </RequireAuth>
            }
          />
          <Route
            path="/books"
            element={
              <RequireAuth>
                <BooksPage />
              </RequireAuth>
            }
          />
          <Route
            path="/classes"
            element={
              <RequireAuth>
                <ClassesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/classes/:classroomId/manage"
            element={
              <RequireAuth>
                <ManageClassPage />
              </RequireAuth>
            }
          />
          <Route
            path="/classes/:classroomId/loans"
            element={
              <RequireAuth>
                <ClassLoansPage />
              </RequireAuth>
            }
          />
          <Route
            path="/students"
            element={
              <RequireAuth>
                <StudentsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/students/:studentId"
            element={
              <RequireAuth>
                <StudentDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/teachers"
            element={
              <RequireAuth>
                <ManageTeachersPage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/school"
            element={
              <RequireAuth>
                <SchoolPage />
              </RequireAuth>
            }
          />

          {/* Catch-all: also where a Supabase auth email link lands, since
              HashRouter reads everything after "#" as a route — its own
              "#message=…"/"#access_token=…" fragment otherwise matches no
              Route above and renders blank. RequireAuth further bounces to
              /login when there's no session. */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
