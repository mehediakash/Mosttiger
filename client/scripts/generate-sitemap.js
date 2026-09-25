/**
 * Sitemap Generator for mosttiger Live
 * Generates sitemap.xml with all public routes
 * Run this script during build or manually: node scripts/generate-sitemap.js
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = "https://mosttiger.com";
const CURRENT_DATE = new Date().toISOString().split("T")[0];

// Define all public routes with priority and change frequency
const routes = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/register", priority: "0.9", changefreq: "weekly" },
  { path: "/promotions", priority: "0.9", changefreq: "daily" },
  { path: "/sports", priority: "0.9", changefreq: "hourly" },
  { path: "/casino", priority: "0.9", changefreq: "daily" },
  { path: "/live-betting", priority: "0.9", changefreq: "hourly" },
  { path: "/deposit", priority: "0.8", changefreq: "weekly" },
  { path: "/about", priority: "0.6", changefreq: "monthly" },
  { path: "/contact", priority: "0.6", changefreq: "monthly" },
  { path: "/responsible-gaming", priority: "0.5", changefreq: "monthly" },
  { path: "/terms", priority: "0.4", changefreq: "yearly" },
  { path: "/privacy", priority: "0.4", changefreq: "yearly" },
];

// Generate XML sitemap
const generateSitemap = () => {
  const urls = routes
    .map(
      (route) => `
  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${CURRENT_DATE}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
    )
    .join("");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls}
</urlset>`;

  // Write to public folder
  const outputPath = resolve(__dirname, "../public/sitemap.xml");
  writeFileSync(outputPath, sitemap, "utf8");

  console.log("✅ Sitemap generated successfully!");
  console.log(`📍 Location: ${outputPath}`);
  console.log(`🔗 URLs included: ${routes.length}`);
};

// Run generator
try {
  generateSitemap();
} catch (error) {
  console.error("❌ Error generating sitemap:", error);
  process.exit(1);
}
