import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./apple.css";
import "./layout.css";
import { WorkspaceProvider } from "@/components/explorer/provider";
const inter = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2",
      weight: "400",
    },
    {
      path: "../../node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2",
      weight: "500",
    },
    {
      path: "../../node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2",
      weight: "600",
    },
  ],
  variable: "--font-inter",
  display: "swap",
  adjustFontFallback: "Arial",
});
export const metadata: Metadata = {
  title: {
    default: "Research Explorer | Apple style preview",
    template: "%s | Research Explorer · Apple preview",
  },
  description:
    "Explore research at UW-Madison. Understand the work, compare your options, and prepare your next step.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={inter.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </body>
    </html>
  );
}
