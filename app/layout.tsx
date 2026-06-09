import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vacantes Mecatrónica Perú — Energía, Minería y Automatización",
  description:
    "Buscador de vacantes practicante/junior de mecatrónica en empresas top de Perú: ABB, Rockwell, Antamina, Cerro Verde, Las Bambas, Southern, ISA REP y más.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
