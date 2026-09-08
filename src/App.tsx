import { HashRouter, Route, Routes } from 'react-router-dom';
import BooksPage from './pages/BooksPage';
import ClassesPage from './pages/ClassesPage';
import ClassLoansPage from './pages/ClassLoansPage';
import LandingPage from './pages/LandingPage';
import ManageClassPage from './pages/ManageClassPage';
import ScanBookPage from './pages/ScanBookPage';
import StudentsPage from './pages/StudentsPage';
import StudentDetailPage from './pages/StudentDetailPage';

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
        <Route path="/" element={<LandingPage />} />
        <Route path="/scan" element={<ScanBookPage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/classes/:classroomId/manage" element={<ManageClassPage />} />
        <Route path="/classes/:classroomId/loans" element={<ClassLoansPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/students/:studentId" element={<StudentDetailPage />} />
      </Routes>
    </HashRouter>
  );
}
