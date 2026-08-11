import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

// CJK 폰트는 서브셋이 커서 preload 하지 않는다 (Next.js 권장).
const notoSansKR = Noto_Sans_KR({
  weight: ["400", "500", "700", "900"],
  preload: false,
  display: "swap",
  variable: "--font-noto-sans-kr",
});

export const metadata: Metadata = {
  title: "오늘바당",
  description:
    "제주 해변·포구를 지도에서 고르면 물때·수온·날씨를 캐릭터와 한 문장으로 바꿔 보여줍니다.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#4FC3E8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} h-full antialiased`}>
      <body className="h-dvh overflow-hidden">{children}</body>
    </html>
  );
}
