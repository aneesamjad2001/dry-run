import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Header } from "@/components/Header";
import "./globals.css";

const serif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const sans = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Dry Run: a first date before the first date", template: "%s · Dry Run" },
  description: "Matched with someone but the chat is going nowhere? Send your clones on a first date, and get a real reason to meet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-dvh font-sans text-[16px] leading-relaxed">
        <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
          <Header />
          <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-6">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
