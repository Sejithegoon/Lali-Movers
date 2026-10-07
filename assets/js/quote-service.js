/*
 * QuoteService — the only place that knows WHERE quote requests are sent.
 *
 * The form (quote.js) builds a plain QuoteRequest object and calls
 * QuoteService.submit(request). Each "provider" turns that object into whatever
 * its backend expects. Today that's Formspree; a future custom API only needs a
 * new provider below + a config switch in config.js.
 *
 * QuoteRequest shape:
 * {
 *   name, email, phone, contactMethod,
 *   service, serviceLabel, date, flexibleDate,
 *   pickup, destination, size, access, heavyItems: [], message,
 *   source: "website", submittedAt: ISO string
 * }
 */
window.QuoteService = (function () {
  "use strict";

  var config = (window.LALI_CONFIG && window.LALI_CONFIG.quote) || {};

  function QuoteError(message, kind) {
    var err = new Error(message);
    err.kind = kind || "server"; // "network" | "timeout" | "validation" | "server"
    return err;
  }

  function withTimeout(ms) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, ms || 20000);
    return { signal: controller.signal, clear: function () { clearTimeout(timer); } };
  }

  var providers = {
    /* Formspree AJAX submission (works on the free plan). */
    formspree: async function (req, signal) {
      var body = {
        _subject: "New quote request: " + req.serviceLabel + " (" + req.name + ")",
        _replyto: req.email,
        name: req.name,
        email: req.email,
        phone: req.phone,
        "preferred contact": req.contactMethod || "No preference",
        service: req.serviceLabel,
        date: req.date + (req.flexibleDate ? " (flexible)" : ""),
        "pickup / job location": req.pickup,
        destination: req.destination || "N/A",
        "size / amount": req.size || "Not specified",
        access: req.access || "Not specified",
        "heavy / special items": req.heavyItems.length ? req.heavyItems.join(", ") : "None listed",
        message: req.message,
        source: req.source
      };

      var res;
      try {
        res = await fetch(config.endpoint, {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: signal
        });
      } catch (e) {
        if (e.name === "AbortError") throw QuoteError("The request timed out.", "timeout");
        throw QuoteError("We couldn't reach the server. Check your connection and try again.", "network");
      }

      if (res.ok) return { ok: true };

      var data = {};
      try { data = await res.json(); } catch (e) { /* non-JSON error page */ }
      var msg = data && data.errors && data.errors.length
        ? data.errors.map(function (x) { return x.message; }).join(" ")
        : "Something went wrong on our end.";
      throw QuoteError(msg, res.status >= 400 && res.status < 500 ? "validation" : "server");
    }

    /*
     * Example for a future backend:
     * api: async function (req, signal) {
     *   const res = await fetch("/api/quotes", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(req), signal });
     *   if (!res.ok) throw QuoteError("Server error", "server");
     *   return res.json(); // e.g. { ok: true, reference: "Q-1042" }
     * }
     */
  };

  async function submit(request) {
    var provider = providers[config.provider];
    if (!provider) throw QuoteError("Quote provider is not configured.", "server");
    var t = withTimeout(config.timeoutMs);
    try {
      return await provider(request, t.signal);
    } finally {
      t.clear();
    }
  }

  return { submit: submit };
})();
