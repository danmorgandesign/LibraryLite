import { HashRouter, Route, Routes } from 'react-router-dom';
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
      <Routes>
        {/* Public / pre-auth */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register-school" element={<RegisterSchoolPage />} />
        <Route path="/register-yourself" element={<RegisterYourselfPage />} />
        <Route path="/admin-onboarding" element={<AdminOnboardingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/teacher-onboarding/with-class" element={<TeacherOnboardingPage hasClass />} />
        <Route path="/teacher-onboarding/without-class" element={<TeacherOnboardingPage hasClass={false} />} />

        {/* Inside the app */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/scan" element={<ScanBookPage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/classes/:classroomId/manage" element={<ManageClassPage />} />
        <Route path="/classes/:classroomId/loans" element={<ClassLoansPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/students/:studentId" element={<StudentDetailPage />} />
        <Route path="/teachers" element={<ManageTeachersPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </HashRouter>
  );
}
