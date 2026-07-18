// Shared age bucketing used across every analytics processor.
// Extracted so the same ranges can never drift between demographic,
// per-option, and per-question breakdowns.

// Buckets a raw age into one of the fixed demographic ranges.
// Returns '56+' for anything above 55 (including out-of-range/garbage highs),
// so callers never need a default case of their own.
export const getAgeGroup = (age) => {
  if (age <= 25) return '18-25';
  if (age <= 35) return '26-35';
  if (age <= 45) return '36-45';
  if (age <= 55) return '46-55';
  return '56+';
};
