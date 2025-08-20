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
        // 设置全局默认字体为 Sora
        sans: ['Sora', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        sora: ['Sora', 'sans-serif'],
      },
    },
  },
  daisyui: {
      themes: [
        {
          light: {
            'primary': '#22C55E',
            'primary-focus': '#16A34A',
            'primary-content': '#FFFFFF',
            
            'secondary': '#34D399',
            'secondary-focus': '#10B981',
            'secondary-content': '#FFFFFF',
            
            'accent': '#10B981',
            'accent-focus': '#059669',
            'accent-content': '#FFFFFF',
            
            'neutral': '#374151',
            'neutral-focus': '#1F2937',
            'neutral-content': '#F9FAFB',
            
            'base-100': '#FFFFFF',
            'base-200': '#F9FAFB',
            'base-300': '#F3F4F6',
            'base-content': '#111827',
            
            'info': '#3B82F6',
            'success': '#10B981',
            'warning': '#F59E0B',
            'error': '#EF4444',
            
            'surface-dark': '#0F0B1A',
            'surface-button': '#22C55E',
            'surface-button-hover': '#16A34A',
            'hover-light': 'rgba(34, 197, 94, 0.1)',
          },
          dark: {
            'primary': '#22C55E',
            'primary-focus': '#16A34A',
            'primary-content': '#FFFFFF',
            
            'secondary': '#34D399',
            'secondary-focus': '#10B981',
            'secondary-content': '#FFFFFF',
            
            'accent': '#10B981',
            'accent-focus': '#059669',
            'accent-content': '#FFFFFF',
            
            'neutral': '#1F2937',
            'neutral-focus': '#111827',
            'neutral-content': '#F9FAFB',
            
            'base-100': '#0F0B1A',
            'base-200': '#1A1625',
            'base-300': '#252033',
            'base-content': '#E5E7EB',
            
            'info': '#3B82F6',
            'info-content': '#DBEAFE',
            
            'success': '#10B981',
            'success-content': '#D1FAE5',
            
            'warning': '#F59E0B',
            'warning-content': '#FEF3C7',
            
            'error': '#EF4444',
            'error-content': '#FEE2E2',
            
            'surface-dark': '#0A0715',
            'surface-button': '#22C55E',
            'surface-button-hover': '#16A34A',
            'hover-light': 'rgba(34, 197, 94, 0.15)',
          },
        },
      ],
    },
  plugins: [
    daisyui,
  ],
} satisfies Config;
