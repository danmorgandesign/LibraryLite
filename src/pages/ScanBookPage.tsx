import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarcodeDetector } from 'barcode-detector/ponyfill';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useAuth } from '../lib/auth';
import ConfirmationScreen from '../components/ConfirmationScreen';
import NotInCataloguePage from './NotInCataloguePage';
import BarcodeNotFoundPage from './BarcodeNotFoundPage';
import ScanCoverPage from './ScanCoverPage';
import CoverNotRecognizedPage from './CoverNotRecognizedPage';
import BookAvailablePage from './BookAvailablePage';
import BookOnLoanPage from './BookOnLoanPage';
import EnterBookDetailsPage from './EnterBookDetailsPage';
import AttachedToBarcodePage from './AttachedToBarcodePage';
import SelectClassAndStudentPage from './SelectClassAndStudentPage';

type CameraStatus = 'requesting' | 'active' | 'error';

type Book = { id: string; title: string; author: string | null; coverUrl: string | null };

type ScanResult =
  | { status: 'scanning' }
  | { status: 'looking-up'; barcode: string }
  | { status: 'not-in-catalogue'; barcode: string; title: string; author: string | null; coverUrl: string | null }
  | { status: 'barcode-not-found'; barcode: string }
  | { status: 'scanning-cover'; barcode: string }
  | { status: 'cover-not-recognized'; barcode: string }
  | { status: 'looking-up-cover-match'; barcode: string; title: string; author: string }
  | { status: 'entering-book-details'; barcode: string }
  | { status: 'attached'; book: Book }
  | { status: 'available'; book: Book }
  | { status: 'on-loan'; book: Book }
  | { status: 'selecting-student'; book: Book }
  | { status: 'loaned'; book: Book }
  | { status: 'returned'; book: Book }
  | { status: 'lookup-error'; message: string };

const SCAN_INTERVAL_MS = 350;
const EXTERNAL_LOOKUP_TIMEOUT_MS = 6000;

const GOOGLE_BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;

// A hung external request used to leave the "Looking up…" state stuck
// indefinitely with no feedback — an outage on the other end shouldn't look
// identical to the app being broken.
async function fetchWithTimeout(url: string, timeoutMs = EXTERNAL_LOOKUP_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// Google Books sometimes serves cover thumbnails over plain http — the app
// itself is served over https, so an http image would get silently blocked
// as mixed content.
function toHttps(url: string | undefined): string | null {
  return url ? url.replace(/^http:\/\//, 'https://') : null;
}

function extractIsbn(identifiers: Array<{ type: string; identifier: string }> | undefined): string | null {
  return (
    identifiers?.find((i) => i.type === 'ISBN_13')?.identifier ??
    identifiers?.find((i) => i.type === 'ISBN_10')?.identifier ??
    null
  );
}

// Open Library's MARC-derived titles sometimes carry the publisher's imprint
// name stuck on the front (e.g. "WALKER The Diamond Brothers In..." for a
// book published by Walker) — a cataloguing artifact, not part of the real
// title. Strip it when the title actually starts with the publisher name.
function stripPublisherPrefix(title: string, publisher: string | null): string {
  if (!publisher) return title;
  const prefix = publisher.trim();
  if (prefix && title.toLowerCase().startsWith(`${prefix.toLowerCase()} `)) {
    return title.slice(prefix.length).trim();
  }
  return title;
}

type BookLookupResult = { title: string | null; author: string | null; coverUrl: string | null };

// Google Books and Open Library sometimes each have a record for the same
// ISBN that disagree — one has a thin/marketing alt-title with no author,
// the other a fuller but scruffier catalogue title. Stitching title from one
// and author from the other (the old approach) risks pairing a title with
// an unrelated author. Instead, prefer whichever source's title+author
// actually go together as a complete record, and only fall back to mixing
// fields when neither source is complete on its own.
function pickBestBookData(google: BookLookupResult, openLibrary: BookLookupResult): BookLookupResult {
  const googleComplete = google.title && google.author;
  const openLibraryComplete = openLibrary.title && openLibrary.author;
  const primary = googleComplete ? google : openLibraryComplete ? openLibrary : null;

  return {
    title: primary?.title ?? google.title ?? openLibrary.title,
    author: primary?.author ?? google.author ?? openLibrary.author,
    coverUrl: google.coverUrl ?? openLibrary.coverUrl,
  };
}

async function lookupGoogleBooksByIsbn(barcode: string): Promise<{ title: string | null; author: string | null; coverUrl: string | null }> {
  try {
    const params = new URLSearchParams({ q: `isbn:${barcode}`, key: GOOGLE_BOOKS_API_KEY });
    const res = await fetchWithTimeout(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
    if (!res.ok) return { title: null, author: null, coverUrl: null };
    const data = await res.json();
    const info = data.items?.[0]?.volumeInfo;
    if (!info) return { title: null, author: null, coverUrl: null };
    return {
      title: info.title ?? null,
      author: info.authors?.[0] ?? null,
      coverUrl: toHttps(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail),
    };
  } catch {
    return { title: null, author: null, coverUrl: null };
  }
}

// Open Library's per-ISBN data endpoint. No API key, no quota, and its
// catalogue (sourced from library MARC records) covers a lot of
// UK/international/older/educational editions that Google Books' ISBN index
// simply doesn't have — queried alongside Google Books rather than instead
// of it since neither source alone has good enough coverage on its own.
async function lookupOpenLibraryByIsbn(barcode: string): Promise<{ title: string | null; author: string | null; coverUrl: string | null }> {
  try {
    const params = new URLSearchParams({ bibkeys: `ISBN:${barcode}`, format: 'json', jscmd: 'data' });
    const res = await fetchWithTimeout(`https://openlibrary.org/api/books?${params.toString()}`);
    if (!res.ok) return { title: null, author: null, coverUrl: null };
    const data = await res.json();
    const info = data[`ISBN:${barcode}`];
    if (!info) return { title: null, author: null, coverUrl: null };
    const publisher: string | null = info.publishers?.[0]?.name ?? null;
    return {
      title: info.title ? stripPublisherPrefix(info.title, publisher) : null,
      author: info.authors?.[0]?.name ?? null,
      coverUrl: toHttps(info.cover?.medium ?? info.cover?.small),
    };
  } catch {
    return { title: null, author: null, coverUrl: null };
  }
}

// Used to preview a book's details when it isn't in our own catalogue yet
// (so "Add to catalogue" has something real to show, not just the raw
// barcode). Queries Google Books and Open Library in parallel — see
// pickBestBookData for how the two records get reconciled.
async function lookupExternalBookData(barcode: string): Promise<{ title: string | null; author: string | null; coverUrl: string | null }> {
  const [google, openLibrary] = await Promise.all([
    lookupGoogleBooksByIsbn(barcode),
    lookupOpenLibraryByIsbn(barcode),
  ]);
  return pickBestBookData(google, openLibrary);
}

async function lookupGoogleBooksByTitleAndAuthor(title: string, author: string): Promise<{ isbn: string | null; coverUrl: string | null }> {
  try {
    const q = author ? `intitle:${title} inauthor:${author}` : `intitle:${title}`;
    const params = new URLSearchParams({ q, key: GOOGLE_BOOKS_API_KEY });
    const res = await fetchWithTimeout(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
    if (!res.ok) return { isbn: null, coverUrl: null };
    const data = await res.json();
    const info = data.items?.[0]?.volumeInfo;
    if (!info) return { isbn: null, coverUrl: null };
    return {
      isbn: extractIsbn(info.industryIdentifiers),
      coverUrl: toHttps(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail),
    };
  } catch {
    return { isbn: null, coverUrl: null };
  }
}

// Open Library's free-text search, as a fallback source for the same
// title/author -> ISBN resolution Google Books does above.
async function lookupOpenLibraryByTitleAndAuthor(title: string, author: string): Promise<{ isbn: string | null; coverUrl: string | null }> {
  try {
    const params = new URLSearchParams({ title, limit: '1' });
    if (author) params.set('author', author);
    const res = await fetchWithTimeout(`https://openlibrary.org/search.json?${params.toString()}`);
    if (!res.ok) return { isbn: null, coverUrl: null };
    const data = await res.json();
    const doc = data.docs?.[0];
    if (!doc) return { isbn: null, coverUrl: null };
    return {
      isbn: doc.isbn?.[0] ?? null,
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    };
  } catch {
    return { isbn: null, coverUrl: null };
  }
}

// Reverse lookup for the cover-scan path: once we have a title/author (from
// the cover, not a barcode), find the matching edition's ISBN so the rest of
// the flow can treat it exactly like a barcode scan (check our own
// catalogue, offer to add it, etc). Tries Google Books and Open Library in
// parallel for the same reason as lookupExternalBookData above.
async function lookupByTitleAndAuthor(title: string, author: string): Promise<{ isbn: string | null; coverUrl: string | null }> {
  const [google, openLibrary] = await Promise.all([
    lookupGoogleBooksByTitleAndAuthor(title, author),
    lookupOpenLibraryByTitleAndAuthor(title, author),
  ]);
  return {
    isbn: google.isbn ?? openLibrary.isbn,
    coverUrl: google.coverUrl ?? openLibrary.coverUrl,
  };
}

async function lookupBarcode(barcode: string): Promise<ScanResult> {
  const supabase = getSupabaseClient();

  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id, title, author, cover_url')
    .eq('barcode', barcode)
    .maybeSingle();

  if (bookError) throw bookError;
  if (!book) {
    const external = await lookupExternalBookData(barcode);
    if (external.title === null) {
      return { status: 'barcode-not-found', barcode };
    }
    return { status: 'not-in-catalogue', barcode, title: external.title, author: external.author, coverUrl: external.coverUrl };
  }

  const bookRecord: Book = { id: book.id, title: book.title, author: book.author, coverUrl: book.cover_url };

  const { data: activeLoan, error: loanError } = await supabase
    .from('loans')
    .select('id')
    .eq('book_id', book.id)
    .is('returned_at', null)
    .maybeSingle();

  if (loanError) throw loanError;

  return activeLoan ? { status: 'on-loan', book: bookRecord } : { status: 'available', book: bookRecord };
}

// After a successful cover scan we have a title/author but not yet a
// barcode. Resolve one via lookupByTitleAndAuthor, then run the normal
// barcode lookup against it — falling back to the barcode actually printed
// on this copy (the one the barcode scan already failed to identify) if no
// edition match turns up, so "not in catalogue" always has a real barcode
// to attach to.
async function resolveCoverMatch(originalBarcode: string, title: string, author: string): Promise<ScanResult> {
  const { isbn, coverUrl } = await lookupByTitleAndAuthor(title, author);

  if (!isbn) {
    // Neither Google Books nor Open Library's fuzzy search found anything
    // at all for this title/author. That's the strongest signal available
    // that the OCR guess isn't a real, reliable read (garbled text, a
    // partial capture, etc), so this counts as a failed cover scan rather
    // than a genuine "not in catalogue" book: falling back to the original
    // scanned barcode here would just relabel that same failure as if it
    // were a
    // confirmed new book, using unverified text as its title.
    return { status: 'cover-not-recognized', barcode: originalBarcode };
  }

  // isbn came back from a genuine Open Library hit — treat it exactly like
  // a successful barcode scan from here.
  const result = await lookupBarcode(isbn);
  if (result.status === 'barcode-not-found') {
    // Vanishingly unlikely (the isbn just came from a real search result),
    // but fall back safely rather than surfacing an inconsistent state if
    // the external per-ISBN lookup somehow disagrees with the search hit.
    return { status: 'not-in-catalogue', barcode: isbn, title, author, coverUrl };
  }
  return result;
}

async function addBookToCatalogue(params: {
  schoolId: string;
  barcode: string;
  title: string | null;
  author: string | null;
  coverUrl: string | null;
}): Promise<Book> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('books')
    // `title` is NOT NULL in the schema — the external lookup doesn't always
    // find one (e.g. a school-only book with no ISBN match), so fall back to
    // a placeholder built from the barcode rather than blocking the add.
    // There's no rename UI yet, so this is a known rough edge, not final.
    .insert({
      school_id: params.schoolId,
      barcode: params.barcode,
      title: params.title ?? `Book ${params.barcode}`,
      author: params.author,
      cover_url: params.coverUrl,
    })
    .select('id, title, author')
    .single();

  if (error) throw error;
  return { id: data.id, title: data.title, author: data.author, coverUrl: params.coverUrl };
}

async function createLoan(schoolId: string, bookId: string, studentId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from('loans').insert({
    school_id: schoolId,
    book_id: bookId,
    student_id: studentId,
  });

  if (error) throw error;
}

async function returnLoan(bookId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('loans')
    .update({ returned_at: new Date().toISOString() })
    .eq('book_id', bookId)
    .is('returned_at', null);

  if (error) throw error;
}

export default function ScanBookPage() {
  const navigate = useNavigate();
  const { teacher } = useAuth();
  // Scan can be launched from almost any page (the header's "Scan a Book"
  // pill, or the landing page's hero CTA) — going back to wherever that was
  // beats the old hardcoded "always return to the landing page" behavior.
  const onClose = () => navigate(-1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('requesting');
  const [scanResult, setScanResult] = useState<ScanResult>({ status: 'scanning' });
  const [isAddingToCatalogue, setIsAddingToCatalogue] = useState(false);
  const [addToCatalogueError, setAddToCatalogueError] = useState<string | null>(null);
  const [isLoaning, setIsLoaning] = useState(false);
  const [loanError, setLoanError] = useState<string | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  // Only the barcode-scanning phase needs this camera — once we move on to a
  // result screen (or the cover-scan screen, which manages its own camera)
  // it's released, and re-acquired if the user comes back via "Try Scanning
  // Barcode Again". Without this, the stream would stay open in the
  // background for the rest of the flow and could conflict with
  // ScanCoverPage requesting the same camera.
  const needsBarcodeCamera = scanResult.status === 'scanning' || scanResult.status === 'looking-up';

  useEffect(() => {
    if (!needsBarcodeCamera) return;

    let stream: MediaStream | null = null;
    let cancelled = false;

    setCameraStatus('requesting');
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
  }, [needsBarcodeCamera]);

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

  // Resolving a cover match (title/author -> ISBN -> catalogue lookup) is a
  // side effect of entering this state, not of rendering it — trigger it
  // here rather than inline in the JSX below.
  useEffect(() => {
    if (scanResult.status !== 'looking-up-cover-match') return;
    const { barcode, title, author } = scanResult;
    let cancelled = false;

    resolveCoverMatch(barcode, title, author)
      .then((result) => {
        if (!cancelled) setScanResult(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setScanResult({
            status: 'lookup-error',
            message: err instanceof Error ? err.message : 'Something went wrong looking up that book.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanResult.status]);

  const resetScan = () => setScanResult({ status: 'scanning' });

  // RequireAuth guarantees this by the time the route renders.
  if (!teacher) return null;

  if (scanResult.status === 'not-in-catalogue') {
    const { barcode, title, author, coverUrl } = scanResult;

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
            const book = await addBookToCatalogue({ schoolId: teacher.school_id, barcode, title, author, coverUrl });
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
            await addBookToCatalogue({ schoolId: teacher.school_id, barcode, title, author, coverUrl });
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

  if (scanResult.status === 'barcode-not-found') {
    const { barcode } = scanResult;
    return (
      <BarcodeNotFoundPage
        barcode={barcode}
        onScanCover={() => setScanResult({ status: 'scanning-cover', barcode })}
        onEnterDetails={() => setScanResult({ status: 'entering-book-details', barcode })}
        onScanAnother={resetScan}
        onCancel={onClose}
      />
    );
  }

  if (scanResult.status === 'scanning-cover') {
    const { barcode } = scanResult;
    return (
      <ScanCoverPage
        onRecognized={(title, author) => {
          setScanResult({ status: 'looking-up-cover-match', barcode, title, author });
        }}
        onNotRecognized={() => setScanResult({ status: 'cover-not-recognized', barcode })}
        onClose={onClose}
      />
    );
  }

  if (scanResult.status === 'looking-up-cover-match') {
    const { title } = scanResult;
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-md p-lg text-center">
        <p className="text-base text-ink-muted">Looking up &ldquo;{title}&rdquo;…</p>
      </div>
    );
  }

  if (scanResult.status === 'cover-not-recognized') {
    const { barcode } = scanResult;
    return (
      <CoverNotRecognizedPage
        onEnterDetails={() => setScanResult({ status: 'entering-book-details', barcode })}
        onScanCoverAgain={() => setScanResult({ status: 'scanning-cover', barcode })}
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
            const book = await addBookToCatalogue({ schoolId: teacher.school_id, barcode, title, author, coverUrl: null });
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

  if (scanResult.status === 'available') {
    const { book } = scanResult;
    return (
      <BookAvailablePage
        title={book.title}
        author={book.author}
        coverUrl={book.coverUrl}
        onLoanThisBook={() => setScanResult({ status: 'selecting-student', book })}
        onScanAnother={resetScan}
        onCancel={onClose}
      />
    );
  }

  if (scanResult.status === 'on-loan') {
    const { book } = scanResult;
    return (
      <BookOnLoanPage
        title={book.title}
        author={book.author}
        coverUrl={book.coverUrl}
        isReturning={isReturning}
        error={returnError}
        onReturnThisBook={async () => {
          setIsReturning(true);
          setReturnError(null);
          try {
            await returnLoan(book.id);
            setScanResult({ status: 'returned', book });
          } catch (err) {
            setReturnError(err instanceof Error ? err.message : 'Could not return this book — try again.');
          } finally {
            setIsReturning(false);
          }
        }}
        onScanAnother={resetScan}
        onCancel={onClose}
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
            await createLoan(teacher.school_id, book.id, studentId);
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

  if (scanResult.status === 'lookup-error') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-md p-lg text-center">
        <p className="text-base text-ink-muted">{scanResult.message}</p>
        <button
          type="button"
          onClick={resetScan}
          className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-white px-lg py-sm text-sm font-medium text-ink-primary"
        >
          Scan Another Book
        </button>
      </div>
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

        {cameraStatus === 'active' && scanResult.status === 'looking-up' && (
          <p className="w-[328px] max-w-full text-center text-base text-ink-muted">
            Looking up barcode {scanResult.barcode}…
          </p>
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
