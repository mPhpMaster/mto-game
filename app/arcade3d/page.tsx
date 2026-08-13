import type { Metadata } from 'next';
import Game3D from '@/components/arcade3d/Game3D';

export const metadata: Metadata = {
  title: 'مواجهة الوحوش: البقاء 3D — MTO Survival 3D',
  description: 'لعبة أكشن ثلاثية الأبعاد: ساحة وحوش العناصر الستّة، ترقيات، والوحش الأعظم — بـThree.js.',
};

export default function Arcade3DPage() {
  return <Game3D />;
}
