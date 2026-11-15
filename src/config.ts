// Public configuration values (not secrets). Set them here or as VITE_ variables in .env.
const env = import.meta.env as Record<string, string | undefined>;

/** Stripe Payment Link for "Genussio Gründerpreis: erstes Jahr" (29,99 €), e.g. https://buy.stripe.com/… */
export const STRIPE_PAYMENT_LINK = env["VITE_STRIPE_PAYMENT_LINK"] ?? "";

/** Meta Pixel ID (numbers only). Empty = no Meta tracking at all. */
export const META_PIXEL_ID = env["VITE_META_PIXEL_ID"] ?? "";

export const LAUNCH_PRICE = 29.99;
export const REGULAR_PRICE = 39.99;
