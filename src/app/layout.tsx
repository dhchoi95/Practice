import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: '우리 가게 운영',
  description: '매장 운영 통합 관리',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
