import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "株価分析MVP",
  description: "株価CSVから移動平均線と機械的なトレンド判定を確認するローカルWebアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
