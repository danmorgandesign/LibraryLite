import { useState } from 'react';
import BooksPage from './pages/BooksPage';
import ClassesPage from './pages/ClassesPage';
import ClassLoansPage from './pages/ClassLoansPage';
import LandingPage from './pages/LandingPage';
import ManageClassPage from './pages/ManageClassPage';
import ScanBookPage from './pages/ScanBookPage';

type Page = 'landing' | 'scan' | 'books' | 'classes' | 'manage-class' | 'class-loans';
type Classroom = { id: string; class_label: string };

export default function App() {
  const [page, setPage] = useState<Page>('landing');
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);

  if (page === 'scan') {
    return <ScanBookPage onClose={() => setPage('landing')} />;
  }

  if (page === 'books') {
    return <BooksPage onScan={() => setPage('scan')} onClassesClick={() => setPage('classes')} />;
  }

  if (page === 'classes') {
    return (
      <ClassesPage
        onScan={() => setPage('scan')}
        onBooksClick={() => setPage('books')}
        onManageClass={(classroom) => {
          setSelectedClassroom(classroom);
          setPage('manage-class');
        }}
        onViewLoans={(classroom) => {
          setSelectedClassroom(classroom);
          setPage('class-loans');
        }}
      />
    );
  }

  if (page === 'manage-class' && selectedClassroom) {
    return (
      <ManageClassPage
        classroomId={selectedClassroom.id}
        classroomLabel={selectedClassroom.class_label}
        onScan={() => setPage('scan')}
        onBooksClick={() => setPage('books')}
        onBack={() => setPage('classes')}
      />
    );
  }

  if (page === 'class-loans' && selectedClassroom) {
    return (
      <ClassLoansPage
        classroomId={selectedClassroom.id}
        classroomLabel={selectedClassroom.class_label}
        onScan={() => setPage('scan')}
        onBooksClick={() => setPage('books')}
        onBack={() => setPage('classes')}
      />
    );
  }

  return (
    <LandingPage
      onScan={() => setPage('scan')}
      onBooksClick={() => setPage('books')}
      onClassesClick={() => setPage('classes')}
    />
  );
}
