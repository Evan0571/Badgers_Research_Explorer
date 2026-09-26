import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
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
const garamond = localFont({
  src: "../../node_modules/@fontsource/eb-garamond/files/eb-garamond-latin-400-normal.woff2",
  variable: "--font-garamond",
  display: "swap",
  weight: "400",
  adjustFontFallback: "Times New Roman",
});
export const metadata: Metadata = {
  title: {
    default: "Research Explorer | Start with curiosity",
    template: "%s | Research Explorer",
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
      className={`${inter.variable} ${garamond.variable}`}
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
