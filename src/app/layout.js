import { Cormorant_Garamond } from 'next/font/google';
import './globals.css';

const serif = Cormorant_Garamond({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata = {
  title: 'Rajitha & Ambar · Cannes, France',
  description: 'You are invited to the wedding celebrations of Rajitha & Ambar in Cannes, France.',
};

export const viewport = {
  themeColor: '#e9e2d7',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={serif.variable}>
      {/* suppressHydrationWarning: browser extensions often inject attributes on <body> */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
