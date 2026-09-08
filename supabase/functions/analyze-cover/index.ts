// Identifies a book from a photo of its front cover, using Google Cloud
// Vision. Two signals, tried in this order:
//
//   1. OCR (text detection): the title is genuinely printed on the cover,
//      so reading it directly is a grounded signal — every word came from
//      pixels actually in the photo. Vision's `fullTextAnnotation` already
//      groups recognized text into blocks/paragraphs/words using its own
//      layout analysis (which handles a tilted/skewed real-world photo far
//      better than re-deriving line grouping from flat word coordinates —
//      an earlier version of this function did that manually and a few
//      degrees of camera tilt was enough to fracture one line of the title
//      into several fragments). The block with the largest *average* word
//      height is taken as the title — a proxy for "the biggest font on the
//      cover" that still works when the title wraps across multiple lines,
//      since every line in that block shares roughly the same font size.
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
type BoundingPoly = { vertices?: Vertex[] };
type Symbol_ = { text: string };
type Word = { boundingBox?: BoundingPoly; symbols?: Symbol_[] };
type Paragraph = { words?: Word[] };
type Block = { paragraphs?: Paragraph[] };
type FullTextAnnotation = { pages?: Array<{ blocks?: Block[] }> };

type VisionResponse = {
  responses?: Array<{
    webDetection?: { bestGuessLabels?: Array<{ label: string }> };
    fullTextAnnotation?: FullTextAnnotation;
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

function wordText(word: Word): string {
  return (word.symbols ?? []).map((s) => s.text).join('');
}

function boxHeight(box: BoundingPoly | undefined): number {
  const ys = (box?.vertices ?? []).map((v) => v.y ?? 0);
  if (ys.length === 0) return 0;
  return Math.max(...ys) - Math.min(...ys);
}

function guessTitleFromFullText(fullTextAnnotation: FullTextAnnotation): string | null {
  const blocks = fullTextAnnotation.pages?.[0]?.blocks ?? [];

  let best: { text: string; avgHeight: number } | null = null;

  for (const block of blocks) {
    const words = (block.paragraphs ?? []).flatMap((p) => p.words ?? []);
    if (words.length === 0) continue;

    const heights = words.map((w) => boxHeight(w.boundingBox));
    const avgHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length;

    const text = (block.paragraphs ?? [])
      .map((p) => (p.words ?? []).map(wordText).join(' '))
      .join(' ')
      .trim();
    if (!text) continue;

    if (!best || avgHeight > best.avgHeight) {
      best = { text, avgHeight };
    }
  }

  return best?.text ?? null;
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

    const textTitle = annotation?.fullTextAnnotation ? guessTitleFromFullText(annotation.fullTextAnnotation) : null;
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
