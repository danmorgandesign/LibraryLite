/**
 * Theme values below are pulled 1:1 from the "Design Tokens" variable
 * collection in the Library Lite Figma file (node-id=29-113), so changes
 * to that collection should be mirrored here.
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // color/primitive/* + color/text|surface|border/* semantic aliases
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
      },
      borderRadius: {
        input: '8px', // radius/input
        pill: '999px', // radius/pill
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
        display: ['Quicksand', 'ui-sans-serif', 'sans-serif'], // Display/Logo text style
        sans: ['Inter', 'ui-sans-serif', 'sans-serif'], // Heading/Body/Label text styles
      },
    },
  },
  plugins: [],
};
