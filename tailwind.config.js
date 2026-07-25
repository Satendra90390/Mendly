/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./frontend/**/*.{html,js,jsx,ts,tsx}",
    "./frontend/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Medical Teal-Green Palette
        primary: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
          950: '#042F2E',
        },
        // Dark theme colors
        dark: {
          bg: '#0F172A',
          'bg-light': '#1E293B',
          card: '#1E293B',
          border: 'rgba(255,255,255,0.06)',
        },
        // Light theme colors
        light: {
          bg: '#FAFBFC',
          'bg-light': '#FFFFFF',
          card: '#FFFFFF',
          border: '#E8ECF1',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'hero': ['clamp(2.5rem, 6vw, 4rem)', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '800' }],
        'h1': ['clamp(2rem, 4vw, 3rem)', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '800' }],
        'h2': ['clamp(1.5rem, 3vw, 2.25rem)', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '700' }],
        'h3': ['clamp(1.25rem, 2.5vw, 1.75rem)', { lineHeight: '1.3', fontWeight: '700' }],
        'body-lg': ['1.125rem', { lineHeight: '1.7', letterSpacing: '0.01em' }],
        'body': ['1rem', { lineHeight: '1.65', letterSpacing: '0.01em' }],
        'body-sm': ['0.875rem', { lineHeight: '1.6', letterSpacing: '0.01em' }],
        'caption': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.02em' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '3rem',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
        'glass-hover': '0 16px 48px rgba(0, 0, 0, 0.16), 0 4px 16px rgba(0, 0, 0, 0.12)',
        'glass-lg': '0 24px 64px rgba(0, 0, 0, 0.2), 0 8px 24px rgba(0, 0, 0, 0.15)',
        'inner-glass': 'inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.05)',
        'glow-primary': '0 0 30px rgba(20, 184, 166, 0.3), 0 0 60px rgba(20, 184, 166, 0.15)',
        'glow-primary-lg': '0 0 40px rgba(20, 184, 166, 0.4), 0 0 80px rgba(20, 184, 166, 0.2)',
      },
      backdropBlur: {
        'glass': '20px',
        'glass-lg': '40px',
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #0F172A 0%, #115E59 50%, #0F172A 100%)',
        'gradient-hero-light': 'linear-gradient(135deg, #FAFBFC 0%, #CCFBF1 50%, #FAFBFC 100%)',
        'gradient-primary': 'linear-gradient(135deg, #14B8A6, #0D9488)',
        'gradient-accent': 'linear-gradient(135deg, #5EEAD4, #2DD4BF)',
        'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        'gradient-card-light': 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)',
        'gradient-orb-1': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(20, 184, 166, 0.15), transparent)',
        'gradient-orb-2': 'radial-gradient(ellipse 60% 40% at 100% 50%, rgba(94, 234, 212, 0.1), transparent)',
        'gradient-orb-3': 'radial-gradient(ellipse 50% 60% at 0% 100%, rgba(13, 148, 136, 0.1), transparent)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'slide-down': 'slideDown 0.4s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'rotate-in': 'rotateIn 0.4s ease-out forwards',
        'accordion-down': 'accordionDown 0.3s ease-out forwards',
        'accordion-up': 'accordionUp 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(20, 184, 166, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(20, 184, 166, 0.4)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        rotateIn: {
          '0%': { opacity: '0', transform: 'rotate(-5deg) scale(0.95)' },
          '100%': { opacity: '1', transform: 'rotate(0) scale(1)' },
        },
        accordionDown: {
          '0%': { height: '0', opacity: '0' },
          '100%': { height: 'var(--radix-accordion-content-height)', opacity: '1' },
        },
        accordionUp: {
          '0%': { height: 'var(--radix-accordion-content-height)', opacity: '1' },
          '100%': { height: '0', opacity: '0' },
        },
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}