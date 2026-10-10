import { Inter } from 'next/font/google';
import Providers from '@/lib/providers';
import NoMediaContextMenu from '@/components/media/NoMediaContextMenu';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'The Local Printer | Find Local Printers & Designers Near You',
  description: 'India\'s largest online directory for printing businesses. Find verified printing services near you.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('lp-theme');
                if (t === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased min-h-screen selection:bg-accent-green selection:text-white`}>
        <Providers>
          <NoMediaContextMenu />
          {children}
        </Providers>
      </body>
    </html>
  );
}
