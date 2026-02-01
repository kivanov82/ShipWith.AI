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
          <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
                  A
                </div>
                <div>
                  <span className="font-semibold text-lg">Agentverse</span>
                  <span className="ml-2 text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">alpha</span>
                </div>
              </div>
              <nav className="flex items-center gap-1">
                <a href="/" className="px-4 py-2 text-sm rounded-lg bg-gray-800 text-white">Dashboard</a>
                <a href="/projects" className="px-4 py-2 text-sm rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition">Projects</a>
                <a href="/agents" className="px-4 py-2 text-sm rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition">Agents</a>
              </nav>
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
          <footer className="border-t border-gray-800 py-2 text-center text-xs text-gray-600 shrink-0">
            Agentverse - Powered by Claude &amp; x402 on Base
          </footer>
        </div>
      </body>
    </html>
  );
}
