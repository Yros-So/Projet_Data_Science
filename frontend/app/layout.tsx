import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Projet Data Science E-commerce",
  description: "Dashboard e-commerce pour avis clients, produits, fournisseurs et recommandations."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
