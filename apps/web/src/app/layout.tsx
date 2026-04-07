import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "SolaShare — Solar RWA on Solana",
  description:
    "Invest in real-world solar energy assets through fractional ownership on Solana. Earn yield, claim revenue, and track your green portfolio.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js?61" strategy="beforeInteractive" />
      </head>
      <body style={{ background: "var(--bg)" }} suppressHydrationWarning>
        <ThemeProvider>
          <WalletProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
