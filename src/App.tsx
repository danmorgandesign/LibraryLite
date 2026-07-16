import { useState } from 'react';
import BooksPage from './pages/BooksPage';
import ClassesPage from './pages/ClassesPage';
import ClassLoansPage from './pages/ClassLoansPage';
import LandingPage from './pages/LandingPage';
import ManageClassPage from './pages/ManageClassPage';
import ScanBookPage from './pages/ScanBookPage';

type Page = 'landing' | 'scan' | 'books' | 'classes' | 'manage-class' | 'class-loans';

export default function App() {
  const [page, setPage] = useState<Page>('landing');

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
        onManageClass={() => setPage('manage-class')}
        onViewLoans={() => setPage('class-loans')}
      />
    );
  }

  if (page === 'manage-class') {
    return (
      <ManageClassPage
        onScan={() => setPage('scan')}
        onBooksClick={() => setPage('books')}
        onBack={() => setPage('classes')}
      />
    );
  }

  if (page === 'class-loans') {
    return (
      <ClassLoansPage
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
