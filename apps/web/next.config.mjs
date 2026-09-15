/** @type {import('next').NextConfig} */
const nextConfig = {
  // السماح باستيراد الحزم المشتركة (قاعدة البيانات + منطق البوت) في الوضع الأحادي
  transpilePackages: ["@apihunter/db", "@apihunter/bot-core"],
  reactStrictMode: true,
};

export default nextConfig;