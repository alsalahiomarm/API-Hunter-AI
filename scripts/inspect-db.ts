import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const prisma = new PrismaClient();

async function main() {
  // Count all services
  const total = await prisma.apiService.count();
  console.log('إجمالي الخدمات:', total);
  
  // Count by status
  const byStatus = await prisma.apiService.groupBy({
    by: ['status'],
    _count: true
  });
  console.log('حسب الحالة:', byStatus);
  
  // Count by category
  const byCat = await prisma.apiService.groupBy({
    by: ['category'],
    _count: true
  });
  console.log('حسب التصنيف:', byCat);
  
  // Find junk services (web-* with content-like titles)
  const junk = await prisma.apiService.findMany({
    where: {
      OR: [
        { slug: { startsWith: 'web-' } },
        { name: { contains: 'أفضل' } },
        { name: { contains: 'قائمة' } },
        { name: { contains: 'مراجعة' } },
        { name: { contains: 'مقال' } },
        { name: { contains: 'أخبار' } },
        { name: { contains: 'news' } },
        { name: { contains: 'best' } },
        { name: { contains: 'top' } },
        { name: { contains: 'review' } },
        { name: { contains: 'guide' } },
        { name: { contains: 'tutorial' } },
        { name: { contains: 'how to' } },
        { name: { contains: 'video' } },
        { name: { contains: 'فيديو' } },
      ]
    },
    select: { id: true, name: true, slug: true, category: true, status: true, activationLink: true }
  });
  console.log('\nخدمات مشبوهة (محتملة junk):', junk.length);
  junk.forEach(s => console.log(' -', s.name, '|', s.slug, '|', s.category, '|', s.status, '|', s.activationLink));
  
  // Check for duplicates
  const dupes = await prisma.$queryRaw`
    SELECT name, COUNT(*) as cnt FROM "ApiService" GROUP BY name HAVING COUNT(*) > 1
  `;
  console.log('\nأسماء مكررة:', dupes);
  
  await prisma.$disconnect();
}
main().catch(console.error);