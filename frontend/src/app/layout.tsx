import type { Metadata } from 'next';
import { Poppins, Work_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { RealtimeProvider } from '@/context/RealtimeContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';

const workSans = Work_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DUO — A private space for two',
  description:
    'An understated, private digital space for two people to exchange messages, drawings, and daily reflections.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${workSans.variable} ${poppins.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-theme-page text-theme-primary font-sans antialiased">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <RealtimeProvider>
                {children}
              </RealtimeProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
