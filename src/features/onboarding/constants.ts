export const BUSINESS_TYPES = [
  "Small Business",
  "Clinic",
  "Restaurant",
  "Real Estate",
  "Car Dealer",
  "Beauty Center",
  "Medical Center",
  "Law Firm",
  "Educational Center",
  "Instagram Shop",
  "Home Business",
  "Local Store",
  "Other",
];

export const LANGUAGE_OPTIONS: Array<{ value: "ar" | "en" | "ku"; label: string }> = [
  { value: "ar", label: "Arabic" },
  { value: "en", label: "English" },
  { value: "ku", label: "Kurdish" },
];

export const TONE_OPTIONS: Array<{
  value: "friendly" | "professional" | "luxury" | "formal" | "casual" | "medical" | "corporate";
  label: string;
}> = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "luxury", label: "Luxury" },
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "medical", label: "Medical" },
  { value: "corporate", label: "Corporate" },
];

export const CREATIVITY_OPTIONS: Array<{ value: "low" | "medium" | "high"; label: string; description: string }> = [
  { value: "low", label: "Low", description: "Sticks closely to facts and scripted answers." },
  { value: "medium", label: "Medium", description: "Balanced — natural but predictable." },
  { value: "high", label: "High", description: "More conversational and expressive." },
];
