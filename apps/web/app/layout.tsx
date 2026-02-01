import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agentverse - AI-Powered Web3 Development',
  description: 'A connected network of AI agents working as a decentralized software development company',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950 text-gray-100">
        <div className="flex flex-col min-h-screen">
          <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white">
                  A
                </div>
                <span className="font-semibold text-lg">Agentverse</span>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">alpha</span>
              </div>
              <nav className="flex items-center gap-6 text-sm">
                <a href="/" className="text-gray-300 hover:text-white transition">Dashboard</a>
                <a href="/projects" className="text-gray-300 hover:text-white transition">Projects</a>
                <a href="/agents" className="text-gray-300 hover:text-white transition">Agents</a>
              </nav>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
          <footer className="border-t border-gray-800 py-4 text-center text-sm text-gray-500">
            Agentverse - Powered by Claude &amp; x402
          </footer>
        </div>
      </body>
    </html>
  );
}
