import { PrismaClient } from "@prisma/client";

// كائن عام موحد لمنع تعدد الاتصالات أثناء الـ hot-reload
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}