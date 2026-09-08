// Identifies a book from a photo of its front cover, using Google Cloud
// Vision's web detection: it reverse-image-searches the photo against
// pages Google has indexed (Amazon, Goodreads, publisher sites, etc.) and
// returns its own best-guess label for what the image is — which for a
// book cover is very often close to "Title (novel)" or "Title by Author".
// This runs server-side, not in the browser, so the Vision API key (billed,
// rate-limited) never ships in the client bundle.
//
// Deliberately does NOT fall back to raw OCR text as a title guess: an
// unconfirmed guess parsed from noisy scanned text is worse than honestly
// reporting "not recognized" and letting the user fall through to manual
// entry, since a wrong guess is what BarcodeNotFoundPage/CoverNotRecognized
// exist to avoid downstream.
//
// Setup required before this works (not done by this code):
//   1. Enable the Cloud Vision API on a Google Cloud project and create an
//      API key restricted to it.
//   2. `supabase secrets set GOOGLE_VISION_API_KEY=<key>` (project must be
//      linked via `supabase link`).
//   3. `supabase functions deploy analyze-cover`

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type VisionWebDetection = {
  bestGuessLabels?: Array<{ label: string }>;
};

type VisionResponse = {
  responses?: Array<{ webDetection?: VisionWebDetection }>;
};

// Google's best-guess label is a raw description, not a structured title —
// strip a trailing parenthetical like " (novel)" / " (2007 book)", and
// split out an author if it's in the "Title by Author" shape. Anything else
// is returned as a title-only guess.
function parseBestGuess(label: string): { title: string; author: string | null } {
  const withoutParenthetical = label.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const byMatch = withoutParenthetical.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch) {
    return { title: byMatch[1].trim(), author: byMatch[2].trim() };
  }
  return { title: withoutParenthetical, author: null };
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
            features: [{ type: 'WEB_DETECTION', maxResults: 5 }],
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
    const bestGuessLabel = data.responses?.[0]?.webDetection?.bestGuessLabels?.[0]?.label;

    if (!bestGuessLabel) {
      return new Response(JSON.stringify({ title: null, author: null }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { title, author } = parseBestGuess(bestGuessLabel);
    return new Response(JSON.stringify({ title, author }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
