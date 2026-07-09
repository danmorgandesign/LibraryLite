/**
 * Base tokens (color/surface/border, spacing) come from the "Design Tokens"
 * variable collection in the Library Lite Figma file (node-id=29-113).
 * Radius scale and the accent color were restyled after ramp.com: tight
 * 6/10px rounded rects instead of pill buttons, and a lime accent fill for
 * the primary CTA, in place of the previous white/bordered pill look.
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          primary: '#0D0D0D', // color/text/primary -> color/primitive/neutral-900
          muted: '#6B7280', // color/text/muted -> color/primitive/neutral-500
        },
        surface: {
          DEFAULT: '#FFFFFF', // color/surface/default -> color/primitive/white
          subtle: '#F2F2F2', // color/surface/subtle -> color/primitive/neutral-100
        },
        line: {
          DEFAULT: '#E4E4E0', // color/border/default -> color/primitive/neutral-200
        },
        accent: {
          DEFAULT: '#EAF22E', // ramp.com primary-button fill (lime/chartreuse)
        },
      },
      borderRadius: {
        sm: '6px', // ramp.com button/nav-hover radius
        md: '10px', // ramp.com input radius
      },
      spacing: {
        xs: '8px', // space/xs
        sm: '12px', // space/sm
        md: '16px', // space/md
        lg: '20px', // space/lg
        xl: '24px', // space/xl
        '2xl': '32px', // space/2xl
      },
      fontFamily: {
        // ramp.com uses a single grotesk sans everywhere (no separate display font)
        sans: ['Inter', 'ui-sans-serif', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
