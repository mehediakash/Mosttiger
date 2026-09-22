/**
 * SEO Configuration for ck369 Live
 * Contains optimized metadata for all pages
 * Keywords optimized for Bangladesh betting market
 */

const BASE_URL = "https://mosttiger.com";

export const seoData = {
  home: {
    title: "ck369 Live | Best Online Betting & Casino in Bangladesh",
    description:
      "Join ck369 Live for the ultimate online betting experience. Live sports betting, cricket, football, casino games, slots. Fast deposits & withdrawals. Sign up now!",
    keywords:
      "online betting bangladesh, ck369 live, live betting, sports betting bd, casino games, cricket betting, football betting, trusted betting site",
    canonical: BASE_URL,
    ogImage: `${BASE_URL}/og-home.jpg`,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "ck369 Live",
      url: BASE_URL,
      logo: `${BASE_URL}/logo.png`,
      description: "Premier online betting and casino platform in Bangladesh",
      sameAs: [
        "https://facebook.com/ck369live",
        "https://twitter.com/ck369live",
        "https://instagram.com/ck369live",
      ],
    },
  },

  liveBetting: {
    title: "Live Betting | Real-Time Sports Betting at ck369 Live",
    description:
      "Experience thrilling live betting on cricket, football, tennis & more. Real-time odds, instant bets, live streaming. Bet live on ck369 with the best odds in Bangladesh.",
    keywords:
      "live betting bangladesh, live sports betting, real time betting, in-play betting, live cricket betting, live football betting, ck369 live",
    canonical: `${BASE_URL}/live-betting`,
    ogImage: `${BASE_URL}/og-live-betting.jpg`,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SportsOrganization",
      name: "ck369 Live Betting",
      url: `${BASE_URL}/live-betting`,
      description:
        "Live sports betting with real-time odds and instant payouts",
    },
  },

  sports: {
    title: "Sports Betting | Cricket, Football & More | ck369 Live",
    description:
      "Bet on cricket, football, tennis, basketball & more sports. Best odds, live updates, secure betting. Join thousands of sports bettors at ck369 Live today!",
    keywords:
      "sports betting bangladesh, cricket betting, football betting, tennis betting, basketball betting, sports odds, ck369 sports",
    canonical: `${BASE_URL}/sports`,
    ogImage: `${BASE_URL}/og-sports.jpg`,
  },

  casino: {
    title: "Online Casino | Slots, Poker, Roulette | ck369 Live Casino",
    description:
      "Play premium casino games at ck369 Live. 1000+ slots, live dealer games, blackjack, roulette, poker. Big jackpots, instant play, secure gaming. Join now!",
    keywords:
      "online casino bangladesh, casino games, slots online, live casino, blackjack, roulette, poker online, ck369 casino",
    canonical: `${BASE_URL}/casino`,
    ogImage: `${BASE_URL}/og-casino.jpg`,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Casino",
      name: "ck369 Live Casino",
      url: `${BASE_URL}/casino`,
      description: "Premium online casino with 1000+ games and live dealers",
    },
  },

  register: {
    title: "Sign Up | Create Account & Get Welcome Bonus | ck369 Live",
    description:
      "Register at ck369 Live in 2 minutes. Get 100% welcome bonus on first deposit. Easy signup, fast verification, instant betting access. Join now!",
    keywords:
      "register ck369, sign up betting account, betting registration bangladesh, welcome bonus, new account betting",
    canonical: `${BASE_URL}/register`,
    ogImage: `${BASE_URL}/og-register.jpg`,
    noindex: false, // Allow indexing for signup page to attract new users
  },

  login: {
    title: "Login | Access Your ck369 Live Account",
    description:
      "Login to your ck369 Live account. Secure access to betting, casino games, deposits, withdrawals. Forgot password? Reset instantly. Login now!",
    keywords: "login ck369, betting account login, secure login, member access",
    canonical: `${BASE_URL}/login`,
    ogImage: `${BASE_URL}/og-login.jpg`,
    noindex: true, // Prevent indexing of login page
  },

  promotions: {
    title: "Promotions & Bonuses | Daily Offers | ck369 Live",
    description:
      "Grab amazing bonuses at ck369 Live! Welcome bonus, deposit bonus, cashback, free bets. Daily promotions for sports & casino. Check today's offers!",
    keywords:
      "betting promotions, welcome bonus, deposit bonus, cashback offers, free bets, betting bonuses bangladesh, ck369 promotions",
    canonical: `${BASE_URL}/promotions`,
    ogImage: `${BASE_URL}/og-promotions.jpg`,
  },

  deposit: {
    title: "Deposit | Fast & Secure Payment Methods | ck369 Live",
    description:
      "Deposit easily with bKash, Nagad, Rocket, cards. Instant deposits, minimum ৳200, secure transactions. Multiple payment methods available. Deposit now!",
    keywords:
      "deposit ck369, bkash deposit, nagad deposit, rocket deposit, betting payment methods bangladesh",
    canonical: `${BASE_URL}/deposit`,
    ogImage: `${BASE_URL}/og-deposit.jpg`,
    noindex: false,
  },

  about: {
    title: "About Us | Leading Betting Platform | ck369 Live",
    description:
      "Learn about ck369 Live - Bangladesh's trusted online betting platform. Licensed, secure, fair gaming. Our mission: provide the best betting experience.",
    keywords:
      "about ck369, betting platform bangladesh, trusted betting site, licensed casino, fair gaming",
    canonical: `${BASE_URL}/about`,
    ogImage: `${BASE_URL}/og-about.jpg`,
  },

  contact: {
    title: "Contact Us | 24/7 Customer Support | ck369 Live",
    description:
      "24/7 customer support at ck369 Live. Live chat, email, phone support. Fast response, expert help. Contact us anytime for betting assistance.",
    keywords:
      "contact ck369, customer support, betting help, live chat support, 24/7 support",
    canonical: `${BASE_URL}/contact`,
    ogImage: `${BASE_URL}/og-contact.jpg`,
  },

  termsConditions: {
    title: "Terms & Conditions | ck369 Live",
    description:
      "Read the terms and conditions of ck369 Live. Rules, regulations, betting terms, responsible gaming policies. Updated 2026.",
    keywords:
      "terms and conditions, betting rules, user agreement, ck369 terms",
    canonical: `${BASE_URL}/terms`,
    ogImage: `${BASE_URL}/og-terms.jpg`,
    noindex: true,
  },

  privacyPolicy: {
    title: "Privacy Policy | Data Protection | ck369 Live",
    description:
      "Your privacy matters. Read our privacy policy to understand how we protect your data at ck369 Live. GDPR compliant, secure data handling.",
    keywords: "privacy policy, data protection, secure betting, user privacy",
    canonical: `${BASE_URL}/privacy`,
    ogImage: `${BASE_URL}/og-privacy.jpg`,
    noindex: true,
  },

  responsibleGaming: {
    title: "Responsible Gaming | Play Safe | ck369 Live",
    description:
      "Bet responsibly at ck369 Live. Self-exclusion tools, deposit limits, time limits. We promote safe and responsible gambling. Get help if needed.",
    keywords:
      "responsible gaming, safe betting, gambling help, self exclusion, betting limits",
    canonical: `${BASE_URL}/responsible-gaming`,
    ogImage: `${BASE_URL}/og-responsible.jpg`,
  },
};

// Helper function to get SEO data for a page
export const getSEO = (page) => {
  return seoData[page] || seoData.home;
};

// Default fallback SEO
export const defaultSEO = seoData.home;
