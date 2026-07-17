import { useEffect, useRef, useState } from 'react';
import { BarcodeDetector } from 'barcode-detector/ponyfill';
import { ensureTenantSession, getSupabaseClient, getTenantSchoolId } from '../lib/supabaseClient';
import ConfirmationScreen from '../components/ConfirmationScreen';
import NotInCataloguePage from './NotInCataloguePage';
import BarcodeNotFoundPage from './BarcodeNotFoundPage';
import EnterBookDetailsPage from './EnterBookDetailsPage';
import AttachedToBarcodePage from './AttachedToBarcodePage';
import SelectClassAndStudentPage from './SelectClassAndStudentPage';

type CameraStatus = 'requesting' | 'active' | 'error';

type Book = { id: string; title: string; author: string | null };

type ScanResult =
  | { status: 'scanning' }
  | { status: 'looking-up'; barcode: string }
  | { status: 'not-in-catalogue'; barcode: string; title: string | null; author: string | null; coverUrl: string | null }
  | { status: 'entering-book-details'; barcode: string }
  | { status: 'attached'; book: Book }
  | { status: 'available'; book: Book }
  | { status: 'on-loan'; book: Book }
  | { status: 'selecting-student'; book: Book }
  | { status: 'loaned'; book: Book }
  | { status: 'returned'; book: Book }
  | { status: 'lookup-error'; message: string };

const SCAN_INTERVAL_MS = 350;

// Open Library's public book API — free, keyless, used to preview a book's
// details when it isn't in our own catalogue yet (so "Add to catalogue" has
// something real to show, not just the raw barcode).
async function lookupExternalBookData(barcode: string): Promise<{ title: string | null; author: string | null; coverUrl: string | null }> {
  try {
    const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${barcode}&format=json&jscmd=data`);
    if (!res.ok) return { title: null, author: null, coverUrl: null };
    const data = await res.json();
    const entry = data[`ISBN:${barcode}`];
    if (!entry) return { title: null, author: null, coverUrl: null };
    return {
      title: entry.title ?? null,
      author: entry.authors?.[0]?.name ?? null,
      coverUrl: entry.cover?.large ?? entry.cover?.medium ?? null,
    };
  } catch {
    return { title: null, author: null, coverUrl: null };
  }
}

async function lookupBarcode(barcode: string): Promise<ScanResult> {
  const supabase = getSupabaseClient();
  await ensureTenantSession();

  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id, title, author')
    .eq('barcode', barcode)
    .maybeSingle();

  if (bookError) throw bookError;
  if (!book) {
    const external = await lookupExternalBookData(barcode);
    return { status: 'not-in-catalogue', barcode, ...external };
  }

  const { data: activeLoan, error: loanError } = await supabase
    .from('loans')
    .select('id')
    .eq('book_id', book.id)
    .is('returned_at', null)
    .maybeSingle();

  if (loanError) throw loanError;

  return activeLoan ? { status: 'on-loan', book } : { status: 'available', book };
}

async function addBookToCatalogue(params: {
  barcode: string;
  title: string | null;
  author: string | null;
  coverUrl: string | null;
}): Promise<Book> {
  const supabase = getSupabaseClient();
  await ensureTenantSession();

  const { data, error } = await supabase
    .from('books')
    // `title` is NOT NULL in the schema — the external lookup doesn't always
    // find one (e.g. a school-only book with no ISBN match), so fall back to
    // a placeholder built from the barcode rather than blocking the add.
    // There's no rename UI yet, so this is a known rough edge, not final.
    .insert({
      school_id: getTenantSchoolId(),
      barcode: params.barcode,
      title: params.title ?? `Book ${params.barcode}`,
      author: params.author,
      cover_url: params.coverUrl,
    })
    .select('id, title, author')
    .single();

  if (error) throw error;
  return data;
}

async function createLoan(bookId: string, studentId: string): Promise<void> {
  const supabase = getSupabaseClient();
  await ensureTenantSession();

  const { error } = await supabase.from('loans').insert({
    school_id: getTenantSchoolId(),
    book_id: bookId,
    student_id: studentId,
  });

  if (error) throw error;
}

async function returnLoan(bookId: string): Promise<void> {
  const supabase = getSupabaseClient();
  await ensureTenantSession();

  const { error } = await supabase
    .from('loans')
    .update({ returned_at: new Date().toISOString() })
    .eq('book_id', bookId)
    .is('returned_at', null);

  if (error) throw error;
}

export default function ScanBookPage({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('requesting');
  const [scanResult, setScanResult] = useState<ScanResult>({ status: 'scanning' });
  const [isAddingToCatalogue, setIsAddingToCatalogue] = useState(false);
  const [addToCatalogueError, setAddToCatalogueError] = useState<string | null>(null);
  const [isLoaning, setIsLoaning] = useState(false);
  const [loanError, setLoanError] = useState<string | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        stream = s;
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraStatus('active');
      })
      .catch(() => {
        if (!cancelled) setCameraStatus('error');
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (cameraStatus !== 'active' || scanResult.status !== 'scanning') return;

    const detector = new BarcodeDetector({ formats: ['ean_13', 'isbn', 'upc_a', 'code_128'] });
    let detecting = false;

    const interval = window.setInterval(async () => {
      if (detecting || !videoRef.current || videoRef.current.readyState < 2) return;
      detecting = true;
      try {
        const results = await detector.detect(videoRef.current);
        if (results.length > 0) {
          const barcode = results[0].rawValue;
          setScanResult({ status: 'looking-up', barcode });
          try {
            const result = await lookupBarcode(barcode);
            setScanResult(result);
          } catch (err) {
            setScanResult({
              status: 'lookup-error',
              message: err instanceof Error ? err.message : 'Something went wrong looking up that book.',
            });
          }
        }
      } finally {
        detecting = false;
      }
    }, SCAN_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [cameraStatus, scanResult.status]);

  const resetScan = () => setScanResult({ status: 'scanning' });

  if (scanResult.status === 'not-in-catalogue') {
    const { barcode, title, author, coverUrl } = scanResult;

    // External lookup found nothing at all (no title) — there's no real data
    // to confirm, so route to genuine manual entry instead of the "Unknown
    // book" placeholder this page used to fall back to.
    if (title === null) {
      return (
        <BarcodeNotFoundPage
          barcode={barcode}
          onEnterDetails={() => setScanResult({ status: 'entering-book-details', barcode })}
          onScanAnother={resetScan}
          onCancel={onClose}
        />
      );
    }

    return (
      <NotInCataloguePage
        barcode={barcode}
        title={title}
        author={author}
        coverUrl={coverUrl}
        isAdding={isAddingToCatalogue}
        error={addToCatalogueError}
        onAddAndLoan={async () => {
          setIsAddingToCatalogue(true);
          setAddToCatalogueError(null);
          try {
            const book = await addBookToCatalogue({ barcode, title, author, coverUrl });
            setScanResult({ status: 'selecting-student', book });
          } catch (err) {
            setAddToCatalogueError(err instanceof Error ? err.message : 'Could not add this book — try again.');
          } finally {
            setIsAddingToCatalogue(false);
          }
        }}
        onAddAndScanAnother={async () => {
          setIsAddingToCatalogue(true);
          setAddToCatalogueError(null);
          try {
            await addBookToCatalogue({ barcode, title, author, coverUrl });
            resetScan();
          } catch (err) {
            setAddToCatalogueError(err instanceof Error ? err.message : 'Could not add this book — try again.');
          } finally {
            setIsAddingToCatalogue(false);
          }
        }}
        onCancel={onClose}
      />
    );
  }

  if (scanResult.status === 'entering-book-details') {
    const { barcode } = scanResult;
    return (
      <EnterBookDetailsPage
        isSaving={isAddingToCatalogue}
        error={addToCatalogueError}
        onSave={async (title, author) => {
          setIsAddingToCatalogue(true);
          setAddToCatalogueError(null);
          try {
            const book = await addBookToCatalogue({ barcode, title, author, coverUrl: null });
            setScanResult({ status: 'attached', book });
          } catch (err) {
            setAddToCatalogueError(err instanceof Error ? err.message : 'Could not save this book — try again.');
          } finally {
            setIsAddingToCatalogue(false);
          }
        }}
        onCancel={onClose}
      />
    );
  }

  if (scanResult.status === 'attached') {
    const { book } = scanResult;
    return (
      <AttachedToBarcodePage
        onLoanThisBook={() => setScanResult({ status: 'selecting-student', book })}
        onScanAnotherBook={resetScan}
        onHome={onClose}
      />
    );
  }

  if (scanResult.status === 'selecting-student') {
    const { book } = scanResult;
    return (
      <SelectClassAndStudentPage
        bookTitle={book.title}
        isLoaning={isLoaning}
        error={loanError}
        onConfirmLoan={async (studentId) => {
          setIsLoaning(true);
          setLoanError(null);
          try {
            await createLoan(book.id, studentId);
            setScanResult({ status: 'loaned', book });
          } catch (err) {
            setLoanError(err instanceof Error ? err.message : 'Could not create the loan — try again.');
          } finally {
            setIsLoaning(false);
          }
        }}
        onCancel={onClose}
      />
    );
  }

  if (scanResult.status === 'loaned') {
    return (
      <ConfirmationScreen
        heading="Book loaned"
        subtitle="This book is now checked out."
        onDone={onClose}
      />
    );
  }

  if (scanResult.status === 'returned') {
    return (
      <ConfirmationScreen
        heading="Book returned"
        subtitle="This book is back on the shelf."
        onDone={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col p-lg">
      <div className="flex w-full shrink-0 justify-end">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-11 items-center justify-center text-xl font-medium text-ink-primary"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-[64px]">
        <div className="relative flex h-[249px] w-[560px] max-w-full items-start overflow-hidden rounded-md border border-line bg-surface-subtle p-lg">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 size-full object-cover ${cameraStatus === 'active' ? '' : 'hidden'}`}
          />
          {cameraStatus !== 'active' && (
            <p className="text-sm text-ink-muted">
              {cameraStatus === 'error'
                ? 'Camera access is unavailable. Allow camera access in your browser settings to scan books.'
                : 'Requesting camera access…'}
            </p>
          )}
        </div>

        {cameraStatus === 'active' && scanResult.status !== 'scanning' && (
          <div className="flex w-[560px] max-w-full flex-col items-center gap-md rounded-md border border-line bg-white p-lg text-center">
            {scanResult.status === 'looking-up' && <p className="text-base text-ink-muted">Looking up barcode {scanResult.barcode}…</p>}

            {scanResult.status === 'available' && (
              <>
                <p className="text-base font-medium text-ink-primary">{scanResult.book.title}</p>
                {scanResult.book.author && <p className="text-sm text-ink-muted">{scanResult.book.author}</p>}
                <p className="text-sm text-ink-muted">Available to loan.</p>
                <button
                  type="button"
                  onClick={() => setScanResult({ status: 'selecting-student', book: scanResult.book })}
                  className="mt-xs inline-flex min-h-[44px] items-center rounded-sm bg-accent px-lg py-sm text-sm font-medium text-ink-primary transition-opacity hover:opacity-90"
                >
                  Loan this book
                </button>
              </>
            )}

            {scanResult.status === 'on-loan' && (
              <>
                <p className="text-base font-medium text-ink-primary">{scanResult.book.title}</p>
                {scanResult.book.author && <p className="text-sm text-ink-muted">{scanResult.book.author}</p>}
                <p className="text-sm text-ink-muted">Currently on loan.</p>
                {returnError && <p className="text-sm text-red-600">{returnError}</p>}
                <button
                  type="button"
                  disabled={isReturning}
                  onClick={async () => {
                    setIsReturning(true);
                    setReturnError(null);
                    try {
                      await returnLoan(scanResult.book.id);
                      setScanResult({ status: 'returned', book: scanResult.book });
                    } catch (err) {
                      setReturnError(err instanceof Error ? err.message : 'Could not return this book — try again.');
                    } finally {
                      setIsReturning(false);
                    }
                  }}
                  className="mt-xs inline-flex min-h-[44px] items-center rounded-sm bg-accent px-lg py-sm text-sm font-medium text-ink-primary transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {isReturning ? 'Returning…' : 'Return this book'}
                </button>
              </>
            )}

            {scanResult.status === 'lookup-error' && <p className="text-sm text-ink-muted">{scanResult.message}</p>}

            {scanResult.status !== 'looking-up' && (
              <button
                type="button"
                onClick={resetScan}
                className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-white px-lg py-sm text-sm font-medium text-ink-primary"
              >
                Scan Another Book
              </button>
            )}
          </div>
        )}

        {scanResult.status === 'scanning' && (
          <p className="w-[328px] max-w-full text-center text-base text-ink-muted">
            Point the tablet&rsquo;s camera at a book&rsquo;s barcode to scan it.
          </p>
        )}
      </div>
    </div>
  );
}
