export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                arabic: ['Almarai', 'sans-serif'],
                cairo: ['Cairo', 'sans-serif'],
                tajawal: ['Tajawal', 'sans-serif'],
                sans: ['Outfit', 'Inter', 'sans-serif'],
            },
            keyframes: {
                swing: {
                    '0%, 100%': { transform: 'rotate(-5deg)' },
                    '50%': { transform: 'rotate(5deg)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                'pulse-slow': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                },
                'gradient-xy': {
                    '0%, 100%': {
                        'background-size': '400% 400%',
                        'background-position': 'left center'
                    },
                    '50%': {
                        'background-size': '200% 200%',
                        'background-position': 'right center'
                    },
                }
            },
            animation: {
                swing: 'swing 3s ease-in-out infinite',
                float: 'float 6s ease-in-out infinite',
                'float-slow': 'float 8s ease-in-out infinite',
                'pulse-slow': 'pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'gradient-xy': 'gradient-xy 15s ease infinite',
            }
        },
    },
    plugins: [
        require("tailwindcss-animate"),
    ],
}
