/* Quote request form — multi-step flow, validation, draft saving, submission states. */
(function () {
  "use strict";

  var form = document.getElementById("quote-form");
  if (!form) return;

  var cfg = window.LALI_CONFIG || {};
  var DRAFT_KEY = "lali-quote-draft";

  var steps = Array.prototype.slice.call(form.querySelectorAll(".form-step"));
  var progressItems = Array.prototype.slice.call(document.querySelectorAll(".progress-step"));
  var progressStatus = document.getElementById("progress-status");
  var card = document.getElementById("quote-card");
  var successPanel = document.getElementById("quote-success");
  var errorAlert = document.getElementById("submit-error");
  var errorText = document.getElementById("submit-error-text");
  var submitBtn = form.querySelector('[type="submit"]');
  var current = 0;
  var submitting = false;

  /* ---------- Service-dependent wording ---------- */
  var SERVICES = {
    residential: {
      label: "Residential Moving",
      pickup: "Moving from", pickupHint: "Current address or neighbourhood", pickupError: "Please enter where you're moving from.",
      destination: "Moving to", destinationHint: "New address or neighbourhood", destinationError: "Please enter where you're moving to.",
      size: "Size of the move",
      sizeOptions: ["Studio / bachelor", "1 bedroom", "2 bedrooms", "3 bedrooms", "4+ bedrooms", "Office / commercial space", "Just a few items"]
    },
    delivery: {
      label: "Furniture Delivery",
      pickup: "Pickup location", pickupHint: "Store, warehouse or home address", pickupError: "Please enter the pickup location.",
      destination: "Delivery address", destinationHint: "Where should it go?", destinationError: "Please enter the delivery address.",
      size: "Number of items",
      sizeOptions: ["1 item", "2–3 items", "4–6 items", "7+ items"]
    },
    junk: {
      label: "Junk Removal",
      pickup: "Job location", pickupHint: "Address or neighbourhood of the cleanout", pickupError: "Please enter the job location.",
      destination: null,
      size: "Approximate amount",
      sizeOptions: ["A few items", "Small load", "About half a truck", "Full truck or more", "Not sure"]
    },
    assembly: {
      label: "Furniture Assembly",
      pickup: "Job location", pickupHint: "Home or business address", pickupError: "Please enter the job location.",
      destination: null,
      size: "Items to assemble",
      sizeOptions: ["1 item", "2–3 items", "4–6 items", "7+ items"]
    }
  };

  var el = function (name) { return form.elements[name]; };
  var destinationField = document.getElementById("field-destination");

  function selectedService() {
    var checked = form.querySelector('input[name="service"]:checked');
    return checked ? checked.value : null;
  }

  function applyService(key) {
    var s = SERVICES[key];
    if (!s) return;
    document.getElementById("pickup-label-text").textContent = s.pickup;
    el("pickup").placeholder = s.pickupHint;
    if (s.destination) {
      destinationField.hidden = false;
      el("destination").required = true;
      el("destination").disabled = false;
      document.getElementById("destination-label-text").textContent = s.destination;
      el("destination").placeholder = s.destinationHint;
    } else {
      destinationField.hidden = true;
      el("destination").required = false;
      el("destination").disabled = true;
      clearError(el("destination"));
    }
    document.getElementById("size-label-text").textContent = s.size;
    var sizeSel = el("size");
    var prev = sizeSel.value;
    sizeSel.innerHTML = '<option value="">Select…</option>' + s.sizeOptions.map(function (o) {
      return '<option' + (o === prev ? " selected" : "") + ">" + o + "</option>";
    }).join("");
  }

  form.addEventListener("change", function (e) {
    if (e.target.name === "service") {
      applyService(e.target.value);
      validateField(e.target);
    }
  });

  /* ---------- Validation ---------- */
  var today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  var todayISO = today.toISOString().slice(0, 10);
  el("date").min = todayISO;

  function digits(v) { return String(v || "").replace(/\D/g, ""); }

  var messages = {
    name: function (v) { return !v.trim() ? "Please enter your name." : v.trim().length < 2 ? "Please enter your full name." : ""; },
    email: function (v) {
      if (!v.trim()) return "Please enter your email address.";
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Please enter a valid email, like name@example.com.";
    },
    phone: function (v) {
      var d = digits(v);
      if (!d) return "Please enter a phone number so we can reach you.";
      return d.length === 10 || (d.length === 11 && d[0] === "1") ? "" : "Please enter a 10-digit phone number, like 204-555-0123.";
    },
    service: function () { return selectedService() ? "" : "Please choose the service you need."; },
    date: function (v) {
      if (!v) return "Please choose a preferred date.";
      return v < todayISO ? "Please choose today or a future date." : "";
    },
    pickup: function (v) {
      var s = SERVICES[selectedService()];
      return v.trim() ? "" : (s ? s.pickupError : "Please enter the location.");
    },
    destination: function (v) {
      var s = SERVICES[selectedService()];
      return el("destination").disabled || v.trim() ? "" : (s && s.destinationError) || "Please enter the destination.";
    },
    message: function (v) { return v.trim().length >= 10 ? "" : v.trim() ? "Please add a little more detail (at least 10 characters)." : "Please tell us a bit about the job."; }
  };

  function fieldWrap(input) { return input.closest(".field"); }

  function setError(input, msg) {
    var wrap = fieldWrap(input);
    if (!wrap) return;
    var out = wrap.querySelector(".field-error");
    wrap.classList.add("has-error");
    if (out) out.textContent = msg;
    var targets = input.name === "service" ? form.querySelectorAll('input[name="service"]') : [input];
    Array.prototype.forEach.call(targets, function (t) { t.setAttribute("aria-invalid", "true"); });
  }

  function clearError(input) {
    var wrap = fieldWrap(input);
    if (!wrap) return;
    wrap.classList.remove("has-error");
    var targets = input.name === "service" ? form.querySelectorAll('input[name="service"]') : [input];
    Array.prototype.forEach.call(targets, function (t) { t.removeAttribute("aria-invalid"); });
  }

  function validateField(input) {
    var rule = messages[input.name];
    if (!rule) return true;
    var msg = rule(input.value || "");
    if (msg) setError(input, msg); else clearError(input);
    return !msg;
  }

  function fieldsIn(step) {
    var seen = {};
    return Array.prototype.slice.call(step.querySelectorAll("input, select, textarea")).filter(function (f) {
      if (!messages[f.name] || seen[f.name] || f.disabled) return false;
      seen[f.name] = true;
      return true;
    });
  }

  function validateStep(i) {
    var firstBad = null;
    fieldsIn(steps[i]).forEach(function (f) {
      if (!validateField(f) && !firstBad) firstBad = f;
    });
    if (firstBad) {
      var target = firstBad.name === "service" ? form.querySelector('input[name="service"]') : firstBad;
      target.focus();
    }
    return !firstBad;
  }

  // Validate on blur once touched; re-validate live while an error is showing
  form.addEventListener("focusout", function (e) {
    if (messages[e.target.name] && e.target.name !== "service" && e.target.value) validateField(e.target);
  });
  form.addEventListener("input", function (e) {
    var wrap = e.target.closest && e.target.closest(".field");
    if (wrap && wrap.classList.contains("has-error")) validateField(e.target);
    saveDraft();
  });

  // Light phone formatting: 2048816848 -> 204-881-6848
  el("phone").addEventListener("blur", function () {
    var d = digits(this.value);
    if (d.length === 11 && d[0] === "1") d = d.slice(1);
    if (d.length === 10) this.value = d.slice(0, 3) + "-" + d.slice(3, 6) + "-" + d.slice(6);
  });

  /* ---------- Step navigation ---------- */
  var STEP_NAMES = ["Contact details", "Job information", "Job details", "Review & submit"];

  function goTo(i, focus) {
    current = Math.max(0, Math.min(i, steps.length - 1));
    steps.forEach(function (s, n) {
      s.classList.toggle("is-active", n === current);
      if (n === current) s.removeAttribute("inert"); else s.setAttribute("inert", "");
    });
    progressItems.forEach(function (p, n) {
      p.classList.toggle("is-complete", n < current);
      p.classList.toggle("is-current", n === current);
      if (n === current) p.setAttribute("aria-current", "step"); else p.removeAttribute("aria-current");
    });
    if (progressStatus) progressStatus.textContent = "Step " + (current + 1) + " of " + steps.length + ": " + STEP_NAMES[current];
    if (current === steps.length - 1) buildReview();
    if (focus !== false) {
      var heading = steps[current].querySelector(".step-title");
      if (heading) heading.focus({ preventScroll: true });
      var top = card.getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h"), 10) || 72) - 16;
      if (window.scrollY > top) window.scrollTo({ top: top, behavior: "smooth" });
    }
  }

  form.addEventListener("click", function (e) {
    var next = e.target.closest("[data-next]");
    var prev = e.target.closest("[data-prev]");
    var edit = e.target.closest("[data-edit]");
    if (next) { e.preventDefault(); if (validateStep(current)) goTo(current + 1); }
    if (prev) { e.preventDefault(); goTo(current - 1); }
    if (edit) { e.preventDefault(); goTo(parseInt(edit.getAttribute("data-edit"), 10)); }
  });

  // Enter in a text input moves forward instead of submitting early
  form.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "checkbox" && current < steps.length - 1) {
      e.preventDefault();
      if (validateStep(current)) goTo(current + 1);
    }
  });

  /* ---------- Review ---------- */
  function collect() {
    var service = selectedService();
    var heavy = Array.prototype.slice.call(form.querySelectorAll('input[name="heavy_items"]:checked')).map(function (c) { return c.value; });
    var contact = form.querySelector('input[name="contact_method"]:checked');
    return {
      name: el("name").value.trim(),
      email: el("email").value.trim(),
      phone: el("phone").value.trim(),
      contactMethod: contact ? contact.value : "",
      service: service,
      serviceLabel: SERVICES[service] ? SERVICES[service].label : "",
      date: el("date").value,
      flexibleDate: el("flexible_date").checked,
      pickup: el("pickup").value.trim(),
      destination: el("destination").disabled ? "" : el("destination").value.trim(),
      size: el("size").value,
      access: el("access").value,
      heavyItems: heavy,
      message: el("message").value.trim(),
      source: "website",
      submittedAt: new Date().toISOString()
    };
  }

  function formatDate(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }

  function row(label, value) {
    var dt = document.createElement("dt"); dt.textContent = label;
    var dd = document.createElement("dd"); dd.textContent = value || "—";
    return [dt, dd];
  }

  function buildReview() {
    var d = collect();
    var s = SERVICES[d.service] || {};
    var groups = {
      contact: [["Name", d.name], ["Email", d.email], ["Phone", d.phone], ["Preferred contact", d.contactMethod || "No preference"]],
      job: [["Service", d.serviceLabel], ["Preferred date", formatDate(d.date) + (d.flexibleDate ? " (flexible)" : "")], [s.pickup || "Location", d.pickup]]
        .concat(d.destination ? [[s.destination, d.destination]] : []),
      details: [[s.size || "Size", d.size || "Not specified"], ["Stairs / access", d.access || "Not specified"],
        ["Heavy / special items", d.heavyItems.join(", ") || "None listed"], ["Details", d.message]]
    };
    Object.keys(groups).forEach(function (key) {
      var dl = document.getElementById("review-" + key);
      dl.innerHTML = "";
      groups[key].forEach(function (pair) { row(pair[0], pair[1]).forEach(function (n) { dl.appendChild(n); }); });
    });
  }

  /* ---------- Draft (survives an accidental refresh in the same tab) ---------- */
  var saveTimer;
  function saveDraft() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var data = {};
      Array.prototype.forEach.call(form.elements, function (f) {
        if (!f.name || f.name.charAt(0) === "_" || f.type === "submit" || f.type === "button") return;
        if (f.type === "checkbox") { if (f.checked) (data[f.name] = data[f.name] || []).push(f.value); }
        else if (f.type === "radio") { if (f.checked) data[f.name] = f.value; }
        else data[f.name] = f.value;
      });
      try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
    }, 250);
  }

  function restoreDraft() {
    var data;
    try { data = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null"); } catch (e) { data = null; }
    if (!data) return false;
    if (data.service) {
      var r = form.querySelector('input[name="service"][value="' + data.service + '"]');
      if (r) { r.checked = true; applyService(data.service); }
    }
    Object.keys(data).forEach(function (name) {
      if (name === "service") return;
      var val = data[name];
      var nodes = form.querySelectorAll('[name="' + name + '"]');
      Array.prototype.forEach.call(nodes, function (f) {
        if (f.type === "checkbox") f.checked = Array.isArray(val) && val.indexOf(f.value) > -1;
        else if (f.type === "radio") f.checked = f.value === val;
        else f.value = val;
      });
    });
    return true;
  }

  function clearDraft() { try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ } }

  /* ---------- Submit ---------- */
  function setLoading(on) {
    submitting = on;
    submitBtn.disabled = on;
    submitBtn.classList.toggle("is-loading", on);
    submitBtn.setAttribute("aria-busy", String(on));
    submitBtn.querySelector(".btn-label").textContent = on ? "Sending request…" : "Submit Quote Request";
    form.setAttribute("aria-busy", String(on));
  }

  function showError(message) {
    errorText.textContent = message;
    errorAlert.hidden = false;
    errorAlert.focus();
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (submitting) return; // duplicate-submit guard
    errorAlert.hidden = true;

    // Re-validate every step; jump to the first one with a problem
    for (var i = 0; i < steps.length - 1; i++) {
      var bad = fieldsIn(steps[i]).some(function (f) { return messages[f.name](f.value || "") !== ""; });
      if (bad) { goTo(i); validateStep(i); return; }
    }

    // Honeypot: bots fill hidden fields. Pretend success, send nothing.
    if (el("_gotcha") && el("_gotcha").value) { showSuccess(collect()); return; }

    var request = collect();
    setLoading(true);
    try {
      await window.QuoteService.submit(request);
      showSuccess(request);
    } catch (err) {
      var msg = err.kind === "timeout"
        ? "The request is taking too long. Please check your connection and try again."
        : err.kind === "network"
          ? "We couldn't send your request. Please check your internet connection and try again."
          : "Sorry, we couldn't send your request (" + err.message + ") Please try again.";
      showError(msg);
      setLoading(false);
    }
  });

  function showSuccess(request) {
    clearDraft();
    document.getElementById("success-name").textContent = request.name.split(" ")[0] || "there";
    document.getElementById("success-contact").textContent =
      request.contactMethod === "Phone call" || request.contactMethod === "Text message"
        ? "at " + request.phone
        : request.contactMethod === "Email" ? "at " + request.email : "by phone or email";
    form.hidden = true;
    document.getElementById("quote-progress").hidden = true;
    successPanel.hidden = false;
    successPanel.focus();
    window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 120, behavior: "smooth" });
    // Hook for analytics/conversion tracking once it's set up (e.g. Google Analytics / Ads)
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "quote_submitted", service: request.service });
  }

  /* ---------- Init ---------- */
  var restored = restoreDraft();
  var params = new URLSearchParams(window.location.search);
  var fromUrl = params.get("service");
  if (fromUrl && SERVICES[fromUrl] && !(restored && selectedService())) {
    var radio = form.querySelector('input[name="service"][value="' + fromUrl + '"]');
    if (radio) radio.checked = true;
  }
  applyService(selectedService() || "residential");
  // applyService rebuilt the size list — restore its saved value
  if (restored) {
    try {
      var saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
      if (saved.size) el("size").value = saved.size;
    } catch (e) { /* ignore */ }
  }
  form.setAttribute("novalidate", "");
  goTo(0, false);
})();
