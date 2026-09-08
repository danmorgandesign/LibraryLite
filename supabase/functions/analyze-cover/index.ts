// Identifies a book from a photo of its front cover, using Google Cloud
// Vision. Two signals, tried in this order:
//
//   1. OCR (text detection): the title is genuinely printed on the cover,
//      so reading it directly is a grounded signal — every word came from
//      pixels actually in the photo. Individual words come back with
//      bounding boxes; grouping them into lines and taking the tallest line
//      is a reasonable proxy for "the title", since it's normally the
//      biggest text on a cover.
//   2. Web detection: reverse-image-searches the photo against pages Google
//      has indexed and returns its own best-guess label for the image. Only
//      used when there's no legible text at all (e.g. an illustration-only
//      cover) — web detection ALWAYS returns *some* best-guess label, even
//      for an image with no real match (there's no confidence score to
//      tell a genuine hit from a shrug), so it's a weaker, last-resort
//      signal rather than the primary one. A few known-generic guesses
//      ("poster", "painting") are filtered out even then.
//
// This runs server-side, not in the browser, so the Vision API key
// (billed, rate-limited) never ships in the client bundle.
//
// Setup required before this works (not done by this code):
//   1. Enable the Cloud Vision API on a Google Cloud project (with billing
//      enabled — web/text detection isn't available on the free trial
//      alone) and create an API key restricted to it.
//   2. `supabase secrets set GOOGLE_VISION_API_KEY=<key>` (project must be
//      linked via `supabase link`).
//   3. `supabase functions deploy analyze-cover`

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Words web detection falls back to when it recognizes the *kind* of image
// rather than its specific content — not book titles, so a guess reduced to
// one of these (after stripping the trailing parenthetical) is treated as
// no match rather than a false hit.
const GENERIC_LABELS = new Set([
  'poster', 'painting', 'photograph', 'photography', 'picture', 'image',
  'illustration', 'book', 'novel', 'text', 'font', 'paper', 'document',
  'publication', 'cover', 'artwork', 'graphics', 'book cover', 'graphic design',
]);

type Vertex = { x?: number; y?: number };
type TextAnnotation = { description: string; boundingPoly?: { vertices?: Vertex[] } };
type VisionResponse = {
  responses?: Array<{
    webDetection?: { bestGuessLabels?: Array<{ label: string }> };
    textAnnotations?: TextAnnotation[];
  }>;
};

// Google's best-guess label is a raw description, not a structured title —
// strip a trailing parenthetical like " (novel)" / " (2007 book)", and
// split out an author if it's in the "Title by Author" shape.
function parseBestGuess(label: string): { title: string; author: string | null } | null {
  const withoutParenthetical = label.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (GENERIC_LABELS.has(withoutParenthetical.toLowerCase())) return null;

  const byMatch = withoutParenthetical.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch) {
    return { title: byMatch[1].trim(), author: byMatch[2].trim() };
  }
  return { title: withoutParenthetical, author: null };
}

function boxHeightAndCenterY(vertices: Vertex[] | undefined): { height: number; centerY: number } {
  // Vision omits the x or y key entirely when its value is 0 (not present
  // as 0) — `v.y ?? 0` fills that back in. Passing a literal 0 into
  // Math.min/max itself (as opposed to into the per-vertex fallback) would
  // wrongly floor every box's top edge at 0, since all real coordinates
  // here are positive.
  const ys = (vertices ?? []).map((v) => v.y ?? 0);
  if (ys.length === 0) return { height: 0, centerY: 0 };
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { height: maxY - minY, centerY: (minY + maxY) / 2 };
}

function boxCenterX(vertices: Vertex[] | undefined): number {
  const xs = (vertices ?? []).map((v) => v.x ?? 0);
  if (xs.length === 0) return 0;
  return (Math.min(...xs) + Math.max(...xs)) / 2;
}

// Groups individual word/line annotations into rows by vertical proximity,
// then returns the tallest row's text — a proxy for "the biggest text on
// the cover", which is normally the title. `textAnnotations[0]` is the full
// text blob Vision also returns, not an individual word, so it's excluded.
function guessTitleFromText(textAnnotations: TextAnnotation[]): string | null {
  const words = textAnnotations.slice(1).map((a) => {
    const { height, centerY } = boxHeightAndCenterY(a.boundingPoly?.vertices);
    return { text: a.description, height, centerY, centerX: boxCenterX(a.boundingPoly?.vertices) };
  });
  if (words.length === 0) return null;

  words.sort((a, b) => a.centerY - b.centerY);

  type Row = { words: typeof words; maxHeight: number };
  const rows: Row[] = [];
  for (const word of words) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(word.centerY - last.words[last.words.length - 1].centerY) < last.maxHeight * 0.7) {
      last.words.push(word);
      last.maxHeight = Math.max(last.maxHeight, word.height);
    } else {
      rows.push({ words: [word], maxHeight: word.height });
    }
  }

  const tallestRow = rows.reduce((best, row) => (row.maxHeight > best.maxHeight ? row : best));
  const title = tallestRow.words
    .sort((a, b) => a.centerX - b.centerX)
    .map((w) => w.text)
    .join(' ')
    .trim();

  return title || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_VISION_API_KEY is not configured.' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { imageBase64 } = await req.json();
    if (typeof imageBase64 !== 'string' || !imageBase64) {
      return new Response(JSON.stringify({ error: 'imageBase64 is required.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const visionRes = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [
              { type: 'WEB_DETECTION', maxResults: 5 },
              { type: 'TEXT_DETECTION', maxResults: 1 },
            ],
          },
        ],
      }),
    });

    if (!visionRes.ok) {
      const text = await visionRes.text();
      return new Response(JSON.stringify({ error: `Vision API error: ${text}` }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const data: VisionResponse = await visionRes.json();
    const annotation = data.responses?.[0];

    const textTitle = annotation?.textAnnotations ? guessTitleFromText(annotation.textAnnotations) : null;
    if (textTitle) {
      return new Response(JSON.stringify({ title: textTitle, author: null }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const bestGuessLabel = annotation?.webDetection?.bestGuessLabels?.[0]?.label;
    const fromWebDetection = bestGuessLabel ? parseBestGuess(bestGuessLabel) : null;
    return new Response(JSON.stringify(fromWebDetection ?? { title: null, author: null }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
