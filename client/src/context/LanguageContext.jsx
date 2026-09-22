import React, { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Get saved language from localStorage or default to 'en'
    return localStorage.getItem("language") || "en";
  });

  useEffect(() => {
    // Save language preference to localStorage
    localStorage.setItem("language", language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "bn" : "en"));
  };

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Translations object
const translations = {
  en: {
    // Navbar
    search_games: "Search Games",
    login: "Login",
    sign_up: "Sign Up",
    deposit: "DEPOSIT",
    user: "User",
    search_placeholder: "Search for games...",
    searching: "Searching...",
    no_games_found: "No games found for",
    try_different_keywords: "Try searching with different keywords",

    // Sidebar
    home: "Home",
    promotions: "Promotions",
    vip_club: "VIP Club",
    affiliates: "Affiliates",
    about_us: "About Us",
    responsible_gambling: "Responsible Gambling",
    terms_conditions: "Terms & Conditions",
    privacy_policy: "Privacy Policy",
    game_categories: "Game Categories",

    // Auth
    email_address: "Email Address",
    password: "Password",
    remember_me: "Remember Me",
    forgot_password: "Forgot Password?",
    dont_have_account: "Don't have an account?",
    register_now: "Register Now",
    full_name: "Full Name",
    phone_number: "Phone Number",
    confirm_password: "Confirm Password",
    promo_code: "Promo Code (Optional)",
    agree_terms: "I agree to the Terms & Conditions",
    already_have_account: "Already have an account?",
    login_now: "Login Now",

    // Games
    live_games: "Live ck369 Games",
    select_category: "Select category and start playing",
    provider_filter: "Provider Filter",
    providers: "providers",
    all_providers: "All Providers",
    clear: "Clear",
    active: "Active",
    hot_games: "HOT GAMES",
    slots: "SLOTS",
    crash: "CRASH",
    casino: "CASINO",
    sports: "SPORTS",
    arcade: "ARCADE",
    table: "TABLE",
    lottery: "LOTTERY",
    fishing: "FISHING",
    no_games_available: "No Games Found",
    no_games_description:
      "There are no games available in this category. Please select another category.",
    view_all_games: "View All Games",
    play: "Play",
    play_now: "PLAY NOW",
    loading_game: "Loading Game...",
    preparing_experience: "Preparing your gaming experience",
    close: "Close",
    error: "Error",
    showing_games: "Showing games",
    previous: "Previous",
    next: "Next",

    // Profile & Wallet
    profile: "Profile",
    wallet: "Wallet",
    balance: "Balance",
    transactions: "Transactions",
    withdraw: "Withdraw",
    logout: "Logout",

    // Common
    yes: "Yes",
    no: "No",
    submit: "Submit",
    cancel: "Cancel",
    save: "Save",
    loading: "Loading",
    success: "Success",
    failed: "Failed",

    // Login Page
    welcome_back: "Welcome back",
    login_to_account: "Login to access your account",
    email: "Email",
    email_placeholder: "you@mail.com",
    password_placeholder: "••••••",
    remember_me_label: "Remember me",
    forgot: "Forgot?",
    logging: "Logging...",
    dont_have_account_text: "Don't have an account?",
    sign_up_link: "Sign up",

    // Register Page
    create_account: "Create account",
    join_and_play: "Join and start playing",
    full_name_placeholder: "John Doe",
    phone_placeholder: "+880 1234567890",
    passwords_not_match: "Passwords do not match",
    registration_successful: "Registration successful! You can now login.",
    have_promo_code: "Have a promo code?",
    enter_promo_code: "Enter promo code",
    apply: "Apply",
    promo_code_valid: "Promo code is valid!",
    invalid_promo: "Invalid or expired promo code",
    enter_promo_first: "Please enter a promo code",
    bonus: "Bonus",
    validating: "Validating...",
    validate: "Validate",
    remove: "Remove",

    // Profile Page
    account_details: "Account Details",
    personal_info: "Personal Information",
    online: "Online",
    total_bets: "Total Bets",
    total_winning: "Total Winning",
    wallet_balance: "Wallet Balance",
    account_info: "Account Information",
    contact_info: "Contact Information",
    security: "Security",
    change_password: "Change Password",
    bet_history: "Bet History",
    view_all: "View All",
    no_bets_yet: "No bets yet",
    start_betting: "Start betting to see your history",

    // Deposit Page
    quick_deposit: "Quick Deposit",
    fund_your_account: "Fund your account instantly",
    payment_method: "Payment Method",
    amount: "Amount",
    your_phone: "Your Phone Number",
    phone_used_for_payment: "Phone number you used for payment",
    transaction_id: "Transaction ID",
    enter_transaction_id: "Enter transaction ID",
    upload_proof: "Upload Payment Proof",
    drag_drop_image: "Drag & drop your payment screenshot here",
    or_click_upload: "or click to upload",
    submit_deposit: "Submit Deposit Request",
    submitting: "Submitting...",
    deposit_successful: "Deposit request submitted successfully!",
    deposit_pending: "Your deposit is being processed",
    deposit_failed: "Failed to submit deposit request",
    try_again: "Please try again",
    min_amount: "Minimum",
    max_amount: "Maximum",
    quick_amounts: "Quick Amounts",
    payment_instructions: "Payment Instructions",
    send_money_to: "Send money to",
    copy: "Copy",
    copied: "Copied!",
    make_payment: "Make the payment using your selected method",
    keep_transaction_id: "Keep your transaction ID safe",
    upload_screenshot: "Upload a clear screenshot of the payment",
    submit_form: "Submit the form with all details",
    popular: "Popular",

    // Common Messages
    please_login: "Please login to continue",
    something_went_wrong: "Something went wrong",
    please_fill_all_fields: "Please fill all required fields",
  },
  bn: {
    // Navbar
    search_games: "গেম খুঁজুন",
    login: "লগইন",
    sign_up: "সাইন আপ",
    deposit: "ডিপোজিট",
    user: "ইউজার",
    search_placeholder: "গেম খুঁজুন...",
    searching: "খোঁজা হচ্ছে...",
    no_games_found: "কোন গেম পাওয়া যায়নি",
    try_different_keywords: "ভিন্ন কীওয়ার্ড দিয়ে চেষ্টা করুন",

    // Sidebar
    home: "হোম",
    promotions: "প্রমোশন",
    vip_club: "ভিআইপি ক্লাব",
    affiliates: "অ্যাফিলিয়েটস",
    about_us: "আমাদের সম্পর্কে",
    responsible_gambling: "দায়িত্বশীল জুয়া",
    terms_conditions: "শর্তাবলী",
    privacy_policy: "গোপনীয়তা নীতি",
    game_categories: "গেম ক্যাটাগরি",

    // Auth
    email_address: "ইমেইল ঠিকানা",
    password: "পাসওয়ার্ড",
    remember_me: "আমাকে মনে রাখো",
    forgot_password: "পাসওয়ার্ড ভুলে গেছেন?",
    dont_have_account: "অ্যাকাউন্ট নেই?",
    register_now: "এখনই নিবন্ধন করুন",
    full_name: "পূর্ণ নাম",
    phone_number: "ফোন নম্বর",
    confirm_password: "পাসওয়ার্ড নিশ্চিত করুন",
    promo_code: "প্রমো কোড (ঐচ্ছিক)",
    agree_terms: "আমি শর্তাবলীতে সম্মত",
    already_have_account: "ইতিমধ্যে একটি অ্যাকাউন্ট আছে?",
    login_now: "এখনই লগইন করুন",

    // Games
    live_games: "লাইভ ১০x গেমস",
    select_category: "ক্যাটাগরি নির্বাচন করুন এবং খেলা শুরু করুন",
    provider_filter: "প্রোভাইডার ফিল্টার",
    providers: "প্রোভাইডার",
    all_providers: "সব প্রোভাইডার",
    clear: "পরিষ্কার",
    active: "সক্রিয়",
    hot_games: "জনপ্রিয় গেমস",
    slots: "স্লটস",
    crash: "ক্র্যাশ",
    casino: "ক্যাসিনো",
    AllGames: "সব গেম",
    flash: "ফ্ল্যাশ",
    minigames: "মিনি গেমস",
    hotslots: "হট স্লটস",
    chess: "চেস",
    sports: "স্পোর্টস",
    casinolive: "ক্যাসিনো লাইভ",
    arcade: "আর্কেড",
    table: "টেবিল",
    lottery: "লটারি",
    fishing: "ফিশিং",
    no_games_available: "কোন গেম পাওয়া যায়নি",
    no_games_description:
      "এই ক্যাটাগরিতে কোন গেম উপলব্ধ নেই। অনুগ্রহ করে অন্য ক্যাটাগরি নির্বাচন করুন।",
    view_all_games: "সব গেম দেখুন",
    play: "খেলুন",
    play_now: "এখনই খেলুন",
    loading_game: "গেম লোড হচ্ছে...",
    preparing_experience: "আপনার গেমিং অভিজ্ঞতা প্রস্তুত করা হচ্ছে",
    close: "বন্ধ করুন",
    error: "ত্রুটি",
    showing_games: "গেম দেখানো হচ্ছে",
    previous: "পূর্ববর্তী",
    next: "পরবর্তী",

    // Profile & Wallet
    profile: "প্রোফাইল",
    wallet: "ওয়ালেট",
    balance: "ব্যালেন্স",
    transactions: "লেনদেন",
    withdraw: "উত্তোলন",
    logout: "লগআউট",

    // Common
    yes: "হ্যাঁ",
    no: "না",
    submit: "জমা দিন",
    cancel: "বাতিল",
    save: "সংরক্ষণ",
    loading: "লোড হচ্ছে",
    success: "সফল",
    failed: "ব্যর্থ",

    // Login Page
    welcome_back: "আবার স্বাগতম",
    login_to_account: "আপনার অ্যাকাউন্টে প্রবেশ করুন",
    email: "ইমেইল",
    email_placeholder: "you@mail.com",
    password_placeholder: "••••••",
    remember_me_label: "আমাকে মনে রাখো",
    forgot: "ভুলে গেছেন?",
    logging: "লগইন করা হচ্ছে...",
    dont_have_account_text: "অ্যাকাউন্ট নেই?",
    sign_up_link: "সাইন আপ",

    // Register Page
    create_account: "অ্যাকাউন্ট তৈরি করুন",
    join_and_play: "যোগ দিন এবং খেলা শুরু করুন",
    full_name_placeholder: "আপনার নাম",
    phone_placeholder: "+৮৮০ ১২৩৪৫৬৭৮৯০",
    passwords_not_match: "পাসওয়ার্ড মিলছে না",
    registration_successful: "নিবন্ধন সফল! এখন আপনি লগইন করতে পারেন।",
    have_promo_code: "প্রমো কোড আছে?",
    enter_promo_code: "প্রমো কোড লিখুন",
    apply: "প্রয়োগ করুন",
    promo_code_valid: "প্রমো কোড বৈধ!",
    invalid_promo: "অবৈধ বা মেয়াদোত্তীর্ণ প্রমো কোড",
    enter_promo_first: "প্রথমে একটি প্রমো কোড লিখুন",
    bonus: "বোনাস",
    validating: "যাচাই করা হচ্ছে...",
    validate: "যাচাই করুন",
    remove: "সরান",

    // Profile Page
    account_details: "অ্যাকাউন্টের বিবরণ",
    personal_info: "ব্যক্তিগত তথ্য",
    online: "অনলাইন",
    total_bets: "মোট বাজি",
    total_winning: "মোট জয়",
    wallet_balance: "ওয়ালেট ব্যালেন্স",
    account_info: "অ্যাকাউন্টের তথ্য",
    contact_info: "যোগাযোগের তথ্য",
    security: "নিরাপত্তা",
    change_password: "পাসওয়ার্ড পরিবর্তন করুন",
    bet_history: "বাজির ইতিহাস",
    view_all: "সব দেখুন",
    no_bets_yet: "এখনো কোন বাজি নেই",
    start_betting: "আপনার ইতিহাস দেখতে বাজি শুরু করুন",
    Recent_Transactions: "আপনার ইতিহাস দেখতে বাজি শুরু করুন",

    // Deposit Page
    quick_deposit: "দ্রুত ডিপোজিট",
    fund_your_account: "তাৎক্ষণিকভাবে আপনার অ্যাকাউন্ট ফান্ড করুন",
    payment_method: "পেমেন্ট পদ্ধতি",
    amount: "পরিমাণ",
    your_phone: "আপনার ফোন নম্বর",
    phone_used_for_payment: "পেমেন্টের জন্য ব্যবহৃত ফোন নম্বর",
    transaction_id: "ট্রানজেকশন আইডি",
    enter_transaction_id: "ট্রানজেকশন আইডি লিখুন",
    upload_proof: "পেমেন্ট প্রমাণ আপলোড করুন",
    drag_drop_image: "আপনার পেমেন্ট স্ক্রিনশট এখানে টেনে আনুন",
    or_click_upload: "অথবা আপলোড করতে ক্লিক করুন",
    submit_deposit: "ডিপোজিট অনুরোধ জমা দিন",
    submitting: "জমা দেওয়া হচ্ছে...",
    deposit_successful: "ডিপোজিট অনুরোধ সফলভাবে জমা হয়েছে!",
    deposit_pending: "আপনার ডিপোজিট প্রক্রিয়া করা হচ্ছে",
    deposit_failed: "ডিপোজিট অনুরোধ জমা দিতে ব্যর্থ",
    try_again: "আবার চেষ্টা করুন",
    min_amount: "সর্বনিম্ন",
    max_amount: "সর্বোচ্চ",
    quick_amounts: "দ্রুত পরিমাণ",
    payment_instructions: "পেমেন্ট নির্দেশাবলী",
    send_money_to: "টাকা পাঠান",
    copy: "কপি",
    copied: "কপি হয়েছে!",
    make_payment: "আপনার নির্বাচিত পদ্ধতি ব্যবহার করে পেমেন্ট করুন",
    keep_transaction_id: "আপনার ট্রানজেকশন আইডি নিরাপদ রাখুন",
    upload_screenshot: "পেমেন্টের একটি স্পষ্ট স্ক্রিনশট আপলোড করুন",
    submit_form: "সমস্ত বিবরণ সহ ফর্ম জমা দিন",
    popular: "জনপ্রিয়",

    // Common Messages
    please_login: "চালিয়ে যেতে লগইন করুন",
    something_went_wrong: "কিছু ভুল হয়েছে",
    please_fill_all_fields: "অনুগ্রহ করে সব তথ্য পূরণ করুন",
  },
};
