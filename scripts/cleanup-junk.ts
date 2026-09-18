import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const prisma = new PrismaClient();

async function main() {
  // IDs of junk services to delete (from inspection)
  const junkSlugs = [
    'web-arab-scholars-com-search-engines-php',
    'web-www-skynewsarabia-com-technology-artific',
    'web-openweathermap-org-api',
    'web-www-xweather-com-products-weather-api',
    'web-developers-google-com-maps-documentation',
    'web-scholar-google-com-hl-ar',
    'web-www-weatherapi-com-',
    'web-www-weather-gov-documentation-services-w',
    'web-business-meteoblue-com-products-weather-',
    'web-gist-github-com-lalithabacies-c8f973dc67',
  ];

  const deleted = await prisma.apiService.deleteMany({
    where: {
      slug: { in: junkSlugs }
    }
  });
  console.log(`🗑️ حُذف ${deleted.count} خدمة مخالفة.`);

  // Verify
  const remaining = await prisma.apiService.count();
  console.log(`✅ المتبقي في قاعدة البيانات: ${remaining} خدمة.`);

  // Show final stats
  const byCat = await prisma.apiService.groupBy({
    by: ['category'],
    _count: true
  });
  console.log('حسب التصنيف:', byCat);

  await prisma.$disconnect();
}
main().catch(console.error);