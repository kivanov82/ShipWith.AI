import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agentverse - AI-Powered Web3 Development',
  description: 'AI agents working together to build Web3 software',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950 text-gray-100 overflow-x-hidden">
        {/* Simple header */}
        <header className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800">
          <div className="px-4 py-3 flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white text-sm">
                A
              </div>
              <span className="font-semibold">Agentverse</span>
            </div>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">alpha</span>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-2xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
