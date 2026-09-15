/** @type {import('next').NextConfig} */
const nextConfig = {
  // السماح باستيراد حزمة قاعدة البيانات المشتركة في الوضع الأحادي
  transpilePackages: ["@apihunter/db"],
  reactStrictMode: true,
};

export default nextConfig;