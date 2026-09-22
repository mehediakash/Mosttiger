import React from "react";
import { Helmet } from "react-helmet-async";

/**
 * Dynamic SEO Component for React Pages
 * Implements Google SEO best practices for betting & casino platform
 *
 * @param {string} title - Page title (50-60 chars recommended)
 * @param {string} description - Meta description (150-160 chars recommended)
 * @param {string} keywords - SEO keywords, comma-separated
 * @param {string} canonical - Canonical URL for the page
 * @param {string} ogImage - Open Graph image URL
 * @param {string} ogType - Open Graph type (default: website)
 * @param {string} twitterCard - Twitter card type (default: summary_large_image)
 * @param {boolean} noindex - Whether to prevent indexing (default: false)
 * @param {string} structuredData - JSON-LD structured data (optional)
 */

const SEO = ({
  title = "ck369 Live | Trusted Online Betting & Casino Platform",
  description = "Experience the best online betting and casino games at ck369 Live. Live sports betting, cricket, football, slots, and more. Fast payouts, trusted platform.",
  keywords = "online betting bangladesh, ck369 live, casino games, sports betting, cricket betting, football betting",
  canonical = "https://mosttiger.com",
  ogImage = "https://mosttiger.com/og-image.jpg",
  ogType = "website",
  twitterCard = "summary_large_image",
  noindex = false,
  structuredData = null,
}) => {
  // Ensure title is within optimal length
  const optimizedTitle =
    title.length > 60 ? title.substring(0, 57) + "..." : title;

  // Ensure description is within optimal length
  const optimizedDescription =
    description.length > 160
      ? description.substring(0, 157) + "..."
      : description;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{optimizedTitle}</title>
      <meta name="description" content={optimizedDescription} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonical} />

      {/* Robots Meta */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
      )}

      {/* Language and Locale */}
      <meta name="language" content="en" />
      <meta httpEquiv="content-language" content="en" />

      {/* Open Graph Tags */}
      <meta property="og:title" content={optimizedTitle} />
      <meta property="og:description" content={optimizedDescription} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="ck369 Live" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={optimizedTitle} />
      <meta name="twitter:description" content={optimizedDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@ck369live" />
      <meta name="twitter:creator" content="@ck369live" />

      {/* Mobile Optimization */}
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=5.0"
      />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta
        name="apple-mobile-web-app-status-bar-style"
        content="black-translucent"
      />

      {/* Security & Performance */}
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

      {/* Author & Publisher */}
      <meta name="author" content="ck369 Live" />
      <meta name="publisher" content="ck369 Live" />

      {/* Revisit */}
      <meta name="revisit-after" content="1 days" />

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
