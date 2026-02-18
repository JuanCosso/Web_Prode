import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getCurrentUser } from "@/src/lib/auth-user";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prode con los Pibes",
  description: "Acertá en un grupo cerrado diferentes resultados.",
};

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/api/ensure-guest");
  }

  return (
    <html lang="es">
      <body className={`${montserrat.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
