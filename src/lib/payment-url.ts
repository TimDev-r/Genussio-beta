/** Stripe Payment Link with the user's email prefilled and the household id as reference. */
export function paymentUrl(link: string, email: string | null | undefined, householdId: string) {
  const url = new URL(link);
  if (email) url.searchParams.set("prefilled_email", email);
  url.searchParams.set("client_reference_id", householdId);
  return url.toString();
}
