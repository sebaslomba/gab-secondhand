import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, Kaushan_Script } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/components/Store";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ProductSheet } from "@/components/ProductSheet";
import { Toast } from "@/components/Toast";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "800"], variable: "--font-bricolage" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter" });
const kaushan = Kaushan_Script({ subsets: ["latin"], weight: "400", variable: "--font-kaushan" });

export const metadata: Metadata = {
  title: "Gab Secondhand",
  description: "Ropa de segunda mano de la mejor calidad, con envíos seguros. Cada prenda es única.",
};
export const viewport: Viewport = { themeColor: "#F5F0E6", viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-PY" className={`${bricolage.variable} ${inter.variable} ${kaushan.variable}`}>
      <body>
        <StoreProvider>
          <div className="bgfx" aria-hidden="true" />
          <Nav />
          {children}
          <Footer />
          <ProductSheet />
          <Toast />
        </StoreProvider>
      </body>
    </html>
  );
}
