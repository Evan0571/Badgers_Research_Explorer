import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./apple.css";
import "./layout.css";
import "./improvements.css";
import { LocaleProvider } from "@/components/locale";
import { WorkspaceProvider } from "@/components/explorer/provider";
import { BRAND_NAME, BRAND_ICON } from "@/lib/brand";
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
    default: BRAND_NAME,
    template: `%s | ${BRAND_NAME}`,
  },
  applicationName: BRAND_NAME,
  icons: {
    icon: { url: BRAND_ICON, type: "image/png" },
    apple: { url: BRAND_ICON, type: "image/png" },
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
        <LocaleProvider>
          <WorkspaceProvider>{children}</WorkspaceProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
