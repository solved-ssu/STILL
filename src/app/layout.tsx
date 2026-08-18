import type { Metadata } from "next";
import "@blocknote/mantine/style.css";
import "pretendard/dist/web/static/pretendard-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "STILL", template: "%s · STILL" },
  description: "배운 것을 남기고, 함께 이어가는 학습 커뮤니티",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
