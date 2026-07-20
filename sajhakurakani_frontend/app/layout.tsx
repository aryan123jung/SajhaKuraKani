import type { Metadata } from "next";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import AppToastProvider from "./_components/AppToastProvider";

export const metadata: Metadata = {
  title: "SajhaKuraKani",
  description: "Secure login experience for SajhaKuraKani",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <AppToastProvider />
      </body>
    </html>
  );
}
