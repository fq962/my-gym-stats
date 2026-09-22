import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Gym Stats",
  description: "Registro de entrenamientos, pesos y progreso",
  appleWebApp: { capable: true, title: "Gym Stats", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0a0c10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <main className="flex-1 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
            {children}
          </main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
