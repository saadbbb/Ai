/**
 * Stable keys stored in workspaces.businessType (a free-text column) and used as
 * translation keys under onboarding.business.businessTypes — never store the
 * translated label itself, or the saved value would depend on whatever language
 * was active when it was picked.
 */
export const BUSINESS_TYPE_KEYS = [
  "smallBusiness",
  "clinic",
  "restaurant",
  "realEstate",
  "carDealer",
  "beautyCenter",
  "medicalCenter",
  "lawFirm",
  "educationalCenter",
  "instagramShop",
  "homeBusiness",
  "localStore",
  "other",
] as const;
