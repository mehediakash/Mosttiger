const AFFILIATE_CODE_KEY = "mosttiger_affiliate_code";
const REFERRAL_CODE_KEY = "mosttiger_referral_code";

const normalizeAffiliateCode = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

export const storeAffiliateCodeFromSearch = (search = "") => {
  const params = new URLSearchParams(search);
  const code = normalizeAffiliateCode(params.get("aff"));
  const referralCode = normalizeAffiliateCode(params.get("ref"));

  if (referralCode) {
    localStorage.setItem(REFERRAL_CODE_KEY, referralCode);
  }

  if (!code) return referralCode || "";

  localStorage.setItem(AFFILIATE_CODE_KEY, code);
  return code;
};

export const getStoredAffiliateCode = () =>
  normalizeAffiliateCode(localStorage.getItem(AFFILIATE_CODE_KEY));

export const clearStoredAffiliateCode = () => {
  localStorage.removeItem(AFFILIATE_CODE_KEY);
};

export const getStoredReferralCode = () =>
  normalizeAffiliateCode(localStorage.getItem(REFERRAL_CODE_KEY));

export const clearStoredReferralCode = () => {
  localStorage.removeItem(REFERRAL_CODE_KEY);
};
