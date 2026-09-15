/**
 * سكربت البذر: أدخل البيانات التجريبية في قاعدة البيانات.
 * التشغيل: npm run db:seed --workspace @apihunter/db
 */
import { prisma } from "./index";
import { seedServices } from "./seed-data";

async function main() {
  console.log("🌱 بدء إدخال الخدمات التجريبية في قاعدة البيانات...");

  let inserted = 0;
  let updated = 0;

  for (const s of seedServices) {
    const upsert = await prisma.apiService.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        provider: s.provider,
        category: s.category,
        description: s.description,
        freeTierDetails: s.freeTier as unknown as object,
        activationLink: s.activationLink,
        documentationLink: s.documentationLink,
        codeExample: s.codeExample,
        status: s.status,
      },
      create: {
        slug: s.slug,
        name: s.name,
        provider: s.provider,
        category: s.category,
        description: s.description,
        freeTierDetails: s.freeTier as unknown as object,
        activationLink: s.activationLink,
        documentationLink: s.documentationLink,
        codeExample: s.codeExample,
        status: s.status,
      },
    });
    if (upsert.createdAt.getTime() >= Date.now() - 1000 * 60) inserted++;
    else updated++;
    console.log(`  ✅ ${s.name} (${s.slug})`);
  }

  const total = await prisma.apiService.count();
  console.log(`\nاكتمل! ${inserted} جديدة، ${updated} محدثة، المجموع الكلي: ${total}`);
  console.log("💡 شغّل زر الويب الآن: npm run dev:web");
}

main()
  .catch((e) => {
    console.error("❌ فشل البذر:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });