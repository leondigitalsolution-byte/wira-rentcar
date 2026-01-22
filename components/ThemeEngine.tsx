
import React, { useEffect } from 'react';
import { AppSettings } from '../types';

const THEME_COLORS: {[key: string]: {main: string, hover: string, light: string, text: string}} = {
    red: { main: '#DC2626', hover: '#B91C1C', light: '#FEF2F2', text: '#DC2626' },
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
            /* OVERRIDE RED BUTTONS/TEXT */
            .bg-red-600, .bg-indigo-600 { background-color: ${color.main} !important; }
            .hover\\:bg-red-700:hover, .hover\\:bg-indigo-700:hover { background-color: ${color.hover} !important; }
            .text-red-600, .text-indigo-600, .text-indigo-700 { color: ${color.text} !important; }
            .bg-red-50, .bg-indigo-50 { background-color: ${color.light} !important; }
            .border-red-600, .focus\\:border-red-600:focus, .focus\\:ring-red-600:focus { border-color: ${color.main} !important; --tw-ring-color: ${color.main} !important; }
            .border-indigo-600 { border-color: ${color.main} !important; }
            
            /* Specific fix for Sidebar Active State */
            .bg-red-600.text-white { background-color: ${color.main} !important; }
            
            /* TRUE BLACK DARK MODE */
            .dark body { background-color: #000000 !important; color: #e5e5e5 !important; }
            .dark .bg-white { background-color: #111111 !important; color: #e5e5e5 !important; border-color: #262626 !important; }
            .dark .bg-slate-50, .dark .bg-slate-100 { background-color: #1a1a1a !important; border-color: #262626 !important; color: #d4d4d4 !important; }
            .dark .border-slate-200, .dark .border-slate-100 { border-color: #262626 !important; }
            .dark .divide-slate-200 { border-color: #262626 !important; }
            
            /* Headings white in dark mode */
            .dark .text-slate-800, .dark .text-slate-900 { color: #ffffff !important; }
            
            /* Subtext gray in dark mode */
            .dark .text-slate-500, .dark .text-slate-600, .dark .text-slate-700 { color: #a3a3a3 !important; }
            
            /* Inputs Dark Mode */
            .dark input, .dark select, .dark textarea { background-color: #000000 !important; border-color: #333333 !important; color: white !important; }
            
            /* Safe Areas */
            .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
            .pt-safe { padding-top: env(safe-area-inset-top); }
        `;
    }, [settings.themeColor, settings.darkMode]);

    return null;
};
