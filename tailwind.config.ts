import type { Config } from "tailwindcss";
import daisyui from "daisyui";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  daisyui: {
      themes: [
        {
          light: {
            'primary': '#5E8B7E',
            'primary-focus': '#4A7267',
            'primary-content': '#FFFFFF',
            
            'secondary': '#81A199',
            'secondary-focus': '#6B867F',
            'secondary-content': '#FFFFFF',
            
            'accent': '#EBCB8B',
            'accent-focus': '#D4B676',
            'accent-content': '#1A1D1B',
            
            'neutral': '#2E3338',
            'neutral-focus': '#1A1D1B',
            'neutral-content': '#FFFFFF',
            
            'base-100': '#FFFFFF',
            'base-200': '#F7FAF8',
            'base-300': '#EEF3F0',
            'base-content': '#2E3338',
            
            'info': '#88C0B0',
            'success': '#A3BE8C',
            'warning': '#EBCB8B',
            'error': '#BF616A',
            'red-100': '#FEEAEA',
            'green-100': '#F0F8F2',
            'red-500': '#BF616A',
            'green-500': '#A3BE8C',
          },
          dark: {
            'primary': '#8FBCAB',
            'primary-focus': '#7BA394',
            'primary-content': '#1A1D1B',
            
            'secondary': '#88C0B0',
            'secondary-focus': '#76A799',
            'secondary-content': '#1A1D1B',
            
            'accent': '#D08770',
            'accent-focus': '#B87460',
            'accent-content': '#FFFFFF',
            
            'neutral': '#B0B4B7',
            'neutral-focus': '#878A8C',
            'neutral-content': '#1A1D1B',
            
            'base-100': '#1A1D1B',
            'base-200': '#222826',
            'base-300': '#2A332E',
            'base-content': '#FFFFFF',
            
            'info': '#88C0B0',
            'success': '#A3BE8C',
            'warning': '#D08770',
            'error': '#BF616A',
            'red-100': '#FEEAEA',
            'green-100': '#F0F8F2',
            'red-500': '#BF616A',
            'green-500': '#A3BE8C',
          },
        },
      ],
    },
  plugins: [
    daisyui,
  ],
} satisfies Config;
