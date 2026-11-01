import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Panxcz License Server',
  description: 'License Key Management Server',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
