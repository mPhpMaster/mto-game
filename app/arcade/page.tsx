import type { Metadata } from 'next';
import ArcadeCanvas from '@/components/arcade/ArcadeCanvas';

export const metadata: Metadata = {
  title: 'مواجهة الوحوش: البقاء — MTO Survival',
  description: 'لعبة أكشن 2D: اصمد أمام موجات وحوش العناصر الستّة، ارتقِ بقواك، واهزم الوحش الأعظم.',
};

export default function ArcadePage() {
  return <ArcadeCanvas />;
}
