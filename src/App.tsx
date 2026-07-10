import { useState } from 'react';
import LandingPage from './pages/LandingPage';
import ScanBookPage from './pages/ScanBookPage';

type Page = 'landing' | 'scan';

export default function App() {
  const [page, setPage] = useState<Page>('landing');

  if (page === 'scan') {
    return <ScanBookPage onClose={() => setPage('landing')} />;
  }

  return <LandingPage onScan={() => setPage('scan')} />;
}
