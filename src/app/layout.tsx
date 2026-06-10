import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-provider";
import { ToastProvider } from "@/components/ui/Toast";

const manrope = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ThothFlow - Pomodoro Timer",
  description:
    "Master your time with the wisdom of Thoth. Track focus sessions, boost productivity, and achieve your goals.",
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "any",
      },
    ],
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    title: "ThothFlow - Pomodoro Timer",
    description:
      "Master your time with the wisdom of Thoth. Track focus sessions, boost productivity, and achieve your goals.",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "ThothFlow Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "ThothFlow - Pomodoro Timer",
    description:
      "Master your time with the wisdom of Thoth. Track focus sessions, boost productivity, and achieve your goals.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className={manrope.className}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
