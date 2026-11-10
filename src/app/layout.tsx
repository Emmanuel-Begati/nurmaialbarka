import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nurul Qur'an School Admin",
  description: "Attendance, fees, students and results management",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
