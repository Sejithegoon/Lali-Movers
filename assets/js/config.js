/*
 * Site-wide business details and integration settings.
 * Change contact details or the form backend here instead of hunting through pages.
 * (Phone/email also appear in page HTML for SEO and no-JS visitors — keep both in sync.)
 */
window.LALI_CONFIG = {
  businessName: "Lali Movers",
  phoneDisplay: "204-881-6848",
  phoneHref: "tel:+12048816848",
  email: "lalimoversinc@gmail.com",
  instagram: "https://www.instagram.com/lalimoversinc/",

  quote: {
    // "formspree" today. To move to a custom backend later, add a provider in
    // quote-service.js (e.g. "api") and switch this value — the form UI won't change.
    provider: "formspree",
    endpoint: "https://formspree.io/f/xeelgyeq",
    timeoutMs: 20000
  }
};
