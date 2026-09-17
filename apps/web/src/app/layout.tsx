import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "API Hunter AI | صيّاد مفاتيح الـ API المجانية",
  description:
    "منصة ووكيل ذكاء اصطناعي يبحث يومياً عن مفاتيح API مجانية وعروض الـ Free Tier لنماذج الذكاء الاصطناعي وأدوات البحث وقواعد البيانات.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen flex flex-col">
        <I18nProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
