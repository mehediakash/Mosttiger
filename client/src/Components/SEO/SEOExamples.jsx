/**
 * SEO IMPLEMENTATION EXAMPLES
 * How to use the SEO component in your pages
 */

import React from "react";
import SEO from "../Components/SEO/SEO";
import { getSEO } from "../Components/SEO/seoData";

// ============================================
// EXAMPLE 1: Using predefined SEO data
// ============================================
const HomePage = () => {
  return (
    <>
      <SEO {...getSEO("home")} />
      {/* Your page content */}
      <div>Home Page Content</div>
    </>
  );
};

// ============================================
// EXAMPLE 2: Custom SEO for dynamic pages
// ============================================
const GameDetailPage = ({ gameId, gameName }) => {
  return (
    <>
      <SEO
        title={`Play ${gameName} | mosttiger Live Casino`}
        description={`Enjoy ${gameName} at mosttiger Live. Win big with exciting casino games. Safe, secure, instant play. Join now!`}
        keywords={`${gameName}, online casino, play ${gameName}, casino games bangladesh`}
        canonical={`https://mosttiger.com/games/${gameId}`}
        ogImage={`https://mosttiger.com/games/${gameId}/thumbnail.jpg`}
      />
      {/* Your page content */}
      <div>Game: {gameName}</div>
    </>
  );
};

// ============================================
// EXAMPLE 3: SEO with structured data
// ============================================
const PromotionsPage = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SpecialAnnouncement",
    name: "Welcome Bonus - 100%",
    description: "Get 100% welcome bonus on your first deposit",
    datePosted: "2026-01-01",
    url: "https://mosttiger.com/promotions",
  };

  return (
    <>
      <SEO {...getSEO("promotions")} structuredData={structuredData} />
      {/* Your page content */}
      <div>Promotions Content</div>
    </>
  );
};

// ============================================
// EXAMPLE 4: Private page (no indexing)
// ============================================
const UserProfilePage = () => {
  return (
    <>
      <SEO
        title="My Profile | mosttiger Live"
        description="Manage your mosttiger Live account settings"
        canonical="https://mosttiger.com/profile"
        noindex={true} // Prevent search engines from indexing
      />
      {/* Your page content */}
      <div>Profile Settings</div>
    </>
  );
};

// ============================================
// EXAMPLE 5: Blog/Article with Article schema
// ============================================
const ArticlePage = ({ title, excerpt, author, publishDate }) => {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: excerpt,
    author: {
      "@type": "Person",
      name: author,
    },
    datePublished: publishDate,
    publisher: {
      "@type": "Organization",
      name: "mosttiger Live",
      logo: {
        "@type": "ImageObject",
        url: "https://mosttiger.com/logo.png",
      },
    },
  };

  return (
    <>
      <SEO
        title={`${title} | mosttiger Live Blog`}
        description={excerpt}
        keywords="betting tips, casino strategy, sports betting guide"
        canonical={`https://mosttiger.com/blog/${title.toLowerCase().replace(/ /g, "-")}`}
        ogType="article"
        structuredData={articleSchema}
      />
      {/* Your page content */}
      <article>
        <h1>{title}</h1>
        <p>{excerpt}</p>
      </article>
    </>
  );
};

export {
  HomePage,
  GameDetailPage,
  PromotionsPage,
  UserProfilePage,
  ArticlePage,
};
