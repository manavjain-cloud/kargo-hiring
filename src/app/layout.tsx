import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppHeader } from "@/components/shell/app-header";
import { Providers } from "@/components/shell/providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Kargo · Hiring Intelligence", template: "%s · Kargo Hiring Intelligence" },
  description: "Evidence-backed candidate recommendations for Kargo's PM and Senior PM roles. AI recommends. Arjun decides.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <Providers>
          <AppHeader />
          <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-[12px] text-subtle sm:px-6">
              <span>
                <span className="font-semibold text-muted">AI recommends. Arjun decides.</span> No score in this tool is a hiring
                decision.
              </span>
              <span>Scored against rubric.txt · Kargo is fictional (MESA case study)</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
