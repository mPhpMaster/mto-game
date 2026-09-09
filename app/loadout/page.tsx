import type { Metadata } from 'next';
import LoadoutDemo from './LoadoutDemo';

export const metadata: Metadata = {
  title: 'التحضير التكتيكي — مواجهة الوحوش',
  description: 'لوحة التجهيزات والطقس: أنفق الطاقة قبل القتال.',
};

export default function LoadoutPage() {
  return <LoadoutDemo />;
}
