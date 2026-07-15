import { useState } from 'react';
import BooksPage from './pages/BooksPage';
import LandingPage from './pages/LandingPage';
import ScanBookPage from './pages/ScanBookPage';

type Page = 'landing' | 'scan' | 'books';

export default function App() {
  const [page, setPage] = useState<Page>('landing');

  if (page === 'scan') {
    return <ScanBookPage onClose={() => setPage('landing')} />;
  }

  if (page === 'books') {
    return <BooksPage onScan={() => setPage('scan')} />;
  }

  return <LandingPage onScan={() => setPage('scan')} onBooksClick={() => setPage('books')} />;
}
