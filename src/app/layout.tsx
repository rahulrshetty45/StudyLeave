import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/context/ThemeContext';
import "./globals.css";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "StudyLeave | Your Personal Learning Assistant",
  description: "Organize your study materials, track progress, and ace your exams with StudyLeave",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
