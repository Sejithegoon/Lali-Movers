# Lali Movers website

Static site for [lalimovers.ca](https://lalimovers.ca/), hosted on GitHub Pages (`CNAME`).
Plain HTML, CSS and JavaScript with no build step and no dependencies (Google Fonts only).

## Structure

```
index.html            Home: hero, services, process, why us, service area, our work, (reviews), FAQ, contact
about.html            About page
quote.html            Multi-step quote request form
404.html              Not-found page (GitHub Pages serves it automatically)
Pages/*.html          Redirects from the old URLs (Home, About Us, Quote, thank-you)

assets/css/styles.css Single stylesheet: theme tokens (light + dark) at the top, then components
assets/js/main.js     Every page: theme toggle, mobile menu, active nav, scroll reveal, FAQ, lightbox, back-to-top
assets/js/config.js   Business details + quote backend settings
assets/js/quote-service.js  Sends quote requests (Formspree today; swap for a custom API later)
assets/js/quote.js    Quote form: steps, validation, review, draft saving, loading/success/error states
assets/brand/logo.png Trimmed header/footer logo
assets/icons/         Favicons, apple-touch-icon, PWA icons
Images/               Photos (currently stock placeholders)

robots.txt, sitemap.xml, site.webmanifest, favicon.ico
CLIENT-TODO.md        Facts the owner still needs to confirm
```

## Run locally

```bash
python -m http.server 8080
```

Then open http://localhost:8080. Paths are root-relative (`/assets/...`), so open the site through a server, not `file://`.

## Common edits

- **Phone / email:** search-and-replace `204-881-6848`, `+12048816848` and `lalimoversinc@gmail.com`
  across the HTML files, and update `assets/js/config.js`.
- **Shared header/footer:** duplicated in each page. If you change one, change all four (`index`, `about`, `quote`, `404`).
- **Photos:** each placeholder image has an HTML comment above it. Replace the `src`, `alt`, `width`/`height`.
  Gallery items also have `data-caption`. Use resized web versions (about 1600–2400px wide) for speed.
- **Colours:** edit the tokens at the top of `styles.css`. `:root` is light; `[data-theme="dark"]` is dark.
- **Reviews:** remove `hidden` from `<section id="reviews">` in `index.html` once real reviews are available.

## Quote form

- With JavaScript: 4 steps (Contact → Job → Details → Review), per-step validation, a draft that survives
  a refresh, a duplicate-submit guard, a loading state, an error message with fallback contact info, and an
  in-page "Quote Request Received" screen. It also pushes a `quote_submitted` event to `window.dataLayer`
  for analytics, once analytics is added.
- Without JavaScript: all fields show as one form and post straight to Formspree.
- Spam: `_gotcha` honeypot field.

### Moving off Formspree later

`quote.js` never talks to Formspree directly. It builds a plain `QuoteRequest` object and calls
`QuoteService.submit()`. To use your own backend:

1. Add a provider in `assets/js/quote-service.js` (there's an `api` example in the comments).
2. Set `quote.provider` (and `endpoint`) in `assets/js/config.js`.

The same `QuoteRequest` shape can become the database record for later features like admin dashboards,
quote status, booking and automated emails or SMS.
