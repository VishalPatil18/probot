// Single source of truth for the operator identity, contact, jurisdiction, and
// effective date referenced across /about, /privacy, /terms, and the footer.
// Update LEGAL_EFFECTIVE_DATE whenever the substance of the policies changes
// so users can see when the terms last shifted.

export const OPERATOR_NAME = "Vishal Patil";
export const OPERATOR_DESCRIPTION =
  "an individual, non-commercial maintainer of an open-source project";
export const CONTACT_EMAIL = "hire.vishalpatil@gmail.com";
export const JURISDICTION = "State of Maryland, United States";
export const MINIMUM_AGE = 16;
// Total elapsed time between "user clicks Delete account" and "data is gone":
// 7 days of soft-delete grace (during which the user can undo via the email
// link or dashboard banner) + a small purge-job cushion. The legacy 30-day
// value pre-dates the automated grace flow and is kept as DELETION_FINAL_DAYS
// for backwards-compatible copy that talks about the outer bound.
export const DELETION_GRACE_DAYS = 7;
export const DELETION_FINAL_DAYS = 30;
export const LEGAL_EFFECTIVE_DATE = "June 21, 2026";
// Parsed form of LEGAL_EFFECTIVE_DATE for comparison against a user's
// last_legal_ack_date. The dashboard ToS banner shows when this is newer than
// the user's acknowledgement (or they've never acknowledged).
export const LEGAL_EFFECTIVE_AT = new Date(LEGAL_EFFECTIVE_DATE);

export const GOOGLE_USER_DATA_POLICY_URL =
  "https://developers.google.com/terms/api-services-user-data-policy";
