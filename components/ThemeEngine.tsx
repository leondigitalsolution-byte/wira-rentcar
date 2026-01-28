
import React, { useEffect } from 'react';
import { AppSettings } from '../types';

const THEME_COLORS: {[key: string]: {main: string, hover: string, light: string, text: string}} = {
    red: { main: '#475569', hover: '#334155', light: '#f1f5f9', text: '#475569' }, // Abu-abu / Slate
    blue: { main: '#2563EB', hover: '#1D4ED8', light: '#EFF6FF', text: '#2563EB' },
    green: { main: '#16A34A', hover: '#15803D', light: '#F0FDF4', text: '#16A34A' },
    purple: { main: '#7C3AED', hover: '#6D28D9', light: '#F5F3FF', text: '#7C3AED' },
    orange: { main: '#EA580C', hover: '#C2410C', light: '#FFF7ED', text: '#EA580C' },
    black: { main: '#1F2937', hover: '#111827', light: '#F3F4F6', text: '#1F2937' },
};

export const ThemeEngine = ({ settings }: { settings: AppSettings }) => {
    useEffect(() => {
        // 1. Handle Dark Mode
        if (settings.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // 2. Handle Color Theme Injection
        const color = THEME_COLORS[settings.themeColor || 'red'] || THEME_COLORS['red'];
        
        const styleId = 'brc-theme-styles';
        let styleTag = document.getElementById(styleId);
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }

        styleTag.innerHTML = `
            /* GLOBAL THEME OVERRIDES - TARGETING RED & INDIGO VARIANTS */
            
            /* Backgrounds */
            .bg-red-600, .bg-red-500, .bg-indigo-600, .bg-indigo-500 { 
                background-color: ${color.main} !important; 
            }
            .hover\\:bg-red-700:hover, .hover\\:bg-red-600:hover, 
            .hover\\:bg-indigo-700:hover, .hover\\:bg-indigo-600:hover { 
                background-color: ${color.hover} !important; 
            }
            
            /* Light Backgrounds */
            .bg-red-50, .bg-red-100, .bg-indigo-50, .bg-indigo-100 { 
                background-color: ${color.light} !important; 
            }
            
            /* Text Colors */
            .text-red-600, .text-red-500, .text-red-700,
            .text-indigo-600, .text-indigo-500, .text-indigo-700 { 
                color: ${color.text} !important; 
            }
            
            /* Borders */
            .border-red-600, .border-red-500, .border-red-200, .border-red-100,
            .border-indigo-600, .border-indigo-500, .border-indigo-200, .border-indigo-100,
            .focus\\:border-red-600:focus, .focus\\:border-indigo-600:focus { 
                border-color: ${color.main} !important; 
            }
            
            /* Rings & Shadows */
            .ring-red-100, .ring-indigo-100, .focus\\:ring-red-600:focus, .focus\\:ring-indigo-600:focus { 
                --tw-ring-color: ${color.main}44 !important; 
                border-color: ${color.main} !important;
            }
            .shadow-red-100, .shadow-indigo-100, .shadow-red-200, .shadow-indigo-200 {
                --tw-shadow-color: ${color.main}22 !important;
                --tw-shadow: 0 10px 15px -3px var(--tw-shadow-color), 0 4px 6px -4px var(--tw-shadow-color) !important;
            }

            /* Buttons & Active States */
            .bg-red-600.text-white, .bg-indigo-600.text-white { 
                background-color: ${color.main} !important; 
                color: white !important;
            }
            
            /* TRUE BLACK DARK MODE */
            .dark body { background-color: #000000 !important; color: #e5e5e5 !important; }
            .dark .bg-white { background-color: #111111 !important; color: #e5e5e5 !important; border-color: #262626 !important; }
            .dark .bg-slate-50, .dark .bg-slate-100 { background-color: #1a1a1a !important; border-color: #262626 !important; color: #d4d4d4 !important; }
            .dark .border-slate-200, .dark .border-slate-100 { border-color: #262626 !important; }
            
            /* Headings white in dark mode */
            .dark .text-slate-800, .dark .text-slate-900 { color: #ffffff !important; }
            
            /* Safe Areas */
            .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
            .pt-safe { padding-top: env(safe-area-inset-top); }
        `;
    }, [settings.themeColor, settings.darkMode]);

    return null;
};
