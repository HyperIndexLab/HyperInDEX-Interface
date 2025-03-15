import type { Config } from "tailwindcss";
import daisyui from "daisyui";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    'node_modules/daisyui/dist/**/*.js',
    'node_modules/react-daisyui/dist/**/*.js',
  ],
  theme: {
    container: {
     screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1280px',
     },
    },
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'custom-purple': 'oklch(0.28 0.07 261.98)',
      },
      fontFamily: {
        // 设置默认字体为 Geist
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        sora: ['Sora', 'sans-serif'],
      },
    },
  },
  daisyui: {
      themes: [
        {
          light: {
            'primary': '#81A1C1',
            'primary-focus': '#5E81AC',
            'primary-content': '#FFFFFF',
            
            'secondary': '#88C0D0',
            'secondary-focus': '#81A1C1',
            'secondary-content': '#2E3440',
            
            'accent': '#B48EAD',
            'accent-focus': '#996B95',
            'accent-content': '#FFFFFF',
            
            'neutral': '#4C566A',
            'neutral-focus': '#434C5E',
            'neutral-content': '#FFFFFF',
            
            'base-100': '#FFFFFF',
            'base-200': '#F5F7FA',
            'base-300': '#E5E9F0',
            'base-content': '#2E3440',
            
            'info': '#81A1C1',
            'success': '#A3BE8C',
            'warning': '#EBCB8B',
            'error': '#BF616A',
            
            'surface-dark': '#1c1d22',
            'surface-button': '#293249',
            'surface-button-hover': '#374462',
            'hover-light': 'rgba(255, 255, 255, 0.05)',
          },
          dark: {
            'primary': '#81A1C1',
            'primary-focus': '#5E81AC',
            'primary-content': '#2E3440',
            
            'secondary': '#88C0D0',
            'secondary-focus': '#81A1C1',
            'secondary-content': '#2E3440',
            
            'accent': '#B48EAD',
            'accent-focus': '#996B95',
            'accent-content': '#FFFFFF',
            
            'neutral': '#D8DEE9',
            'neutral-focus': '#E5E9F0',
            'neutral-content': '#2E3440',
            
            'base-100': '#2E3440',
            'base-200': '#3B4252',
            'base-300': '#434C5E',
            'base-content': '#ECEFF4',
            
            'info': '#81A1C1',
            'success': '#A3BE8C',
            'warning': '#EBCB8B',
            'error': '#BF616A',
            
            'surface-dark': '#1c1d22',
            'surface-button': '#293249',
            'surface-button-hover': '#374462',
            'hover-light': 'rgba(255, 255, 255, 0.05)',
          },
        },
      ],
    },
  plugins: [
    daisyui,
  ],
} satisfies Config;
