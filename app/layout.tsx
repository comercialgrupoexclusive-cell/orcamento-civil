import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Sidebar, MobileSidebar } from '@/components/sidebar';
import { Toaster } from '@/components/ui/sonner';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'Orçamento Civil',
  description: 'Sistema de orçamento para construção civil',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={geist.variable}>
      <body className="min-h-screen flex flex-col md:flex-row bg-background font-sans antialiased">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <MobileSidebar />
          <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
