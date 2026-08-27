/* ============================================================
   The Spaceback Awards 2026 — submission form
   Validates and POSTs the entry to a Google Apps Script web app,
   which appends a row to a Google Sheet and saves the logo to Drive.
   ============================================================ */
(function () {
  "use strict";

  /* ----------------------------------------------------------
     CONFIG — paste the Apps Script Web App URL here after
     deploying apps-script/Code.gs (Deploy → Web app → Anyone).
     Until it is set, the form validates and shows a friendly
     message instead of sending.
     ---------------------------------------------------------- */
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbw82cfpEgYYDU-zunxZVN2VjS2_ZctVqBtjV-LzutO59Nfvs_Ae981k1dx6E_tygqgt/exec";

  var MAX_LOGO_BYTES = 10 * 1024 * 1024; // 10 MB

  var form = document.getElementById("entryForm");
  if (!form) return;

  var statusEl = document.getElementById("formStatus");
  var submitBtn = document.getElementById("submitBtn");
  var logoInput = document.getElementById("logo");
  var logoName = document.getElementById("logoName");

  /* ---------- file picker label ---------- */
  logoInput.addEventListener("change", function () {
    var f = logoInput.files && logoInput.files[0];
    logoName.textContent = f ? f.name : "No file selected";
    clearError(logoInput.closest(".field"));
  });

  /* clear a field's error state as the user fixes it */
  form.addEventListener("input", function (e) {
    var field = e.target.closest(".field");
    if (field) clearError(field);
  });
  form.addEventListener("change", function (e) {
    if (e.target.name === "categories" || e.target.id === "consent") {
      var field = e.target.closest(".field");
      if (field) clearError(field);
    }
  });

  function setError(field, msg) {
    if (!field) return;
    field.classList.add("has-error");
    var m = field.querySelector(".field-error");
    if (!m) {
      m = document.createElement("p");
      m.className = "field-error";
      field.appendChild(m);
    }
    m.textContent = msg;
  }
  function clearError(field) {
    if (!field || !field.classList.contains("has-error")) return;
    field.classList.remove("has-error");
    var m = field.querySelector(".field-error");
    if (m) m.remove();
  }

  function fieldOf(id) {
    var el = document.getElementById(id);
    return el ? el.closest(".field") : null;
  }

  /* ---------- validation ---------- */
  function validate() {
    var ok = true;
    var firstBad = null;

    // start clean so a re-submit reflects the current state
    var prior = form.querySelectorAll(".field.has-error");
    Array.prototype.forEach.call(prior, function (f) { clearError(f); });

    var required = ["firstName", "lastName", "email", "jobTitle", "company", "creativeLinks", "goals", "quant", "qual", "behind"];
    required.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el.value.trim()) {
        setError(el.closest(".field"), "This field is required.");
        ok = false;
        firstBad = firstBad || el;
      }
    });

    var email = document.getElementById("email");
    if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      setError(email.closest(".field"), "Please enter a valid email address.");
      ok = false;
      firstBad = firstBad || email;
    }

    // creative links — require at least one http(s) URL
    var creative = document.getElementById("creativeLinks");
    if (creative.value.trim() && !/https?:\/\/\S+/i.test(creative.value)) {
      setError(creative.closest(".field"), "Please include at least one valid link starting with http.");
      ok = false;
      firstBad = firstBad || creative;
    }

    // logo
    var f = logoInput.files && logoInput.files[0];
    if (!f) {
      setError(logoInput.closest(".field"), "Please upload your company logo.");
      ok = false;
      firstBad = firstBad || logoInput;
    } else if (f.size > MAX_LOGO_BYTES) {
      setError(logoInput.closest(".field"), "That file is over 10 MB. Please upload a smaller logo.");
      ok = false;
      firstBad = firstBad || logoInput;
    }

    // categories — at least one
    var cats = form.querySelectorAll('input[name="categories"]:checked');
    if (cats.length === 0) {
      setError(document.getElementById("categoryGroup").closest(".field"), "Please select at least one category.");
      ok = false;
      firstBad = firstBad || document.getElementById("categoryGroup");
    }

    // consent
    var consent = document.getElementById("consent");
    if (!consent.checked) {
      setError(consent.closest(".field"), "Consent is required to enter.");
      ok = false;
      firstBad = firstBad || consent;
    }

    if (firstBad) firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
    return ok;
  }

  /* ---------- read the logo as base64 ---------- */
  function readLogo(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var res = String(reader.result);
        var base64 = res.indexOf(",") !== -1 ? res.split(",")[1] : res;
        resolve({ name: file.name, mimeType: file.type || "application/octet-stream", dataBase64: base64 });
      };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }

  function collect(logo) {
    return {
      firstName: val("firstName"),
      lastName: val("lastName"),
      email: val("email"),
      jobTitle: val("jobTitle"),
      company: val("company"),
      categories: Array.prototype.map.call(
        form.querySelectorAll('input[name="categories"]:checked'),
        function (c) { return c.value; }
      ),
      flightDates: val("flightDates"),
      creativeLinks: val("creativeLinks"),
      goals: val("goals"),
      quant: val("quant"),
      qual: val("qual"),
      behind: val("behind"),
      consent: document.getElementById("consent").checked,
      logo: logo,
      submittedAt: new Date().toISOString(),
    };
  }
  function val(id) { return document.getElementById(id).value.trim(); }

  function setStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.className = "form-status" + (kind ? " is-" + kind : "");
  }

  /* ---------- submit ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    setStatus("", "");
    if (!validate()) {
      setStatus("Please fix the highlighted fields.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";
    setStatus("Uploading your entry…", "pending");

    readLogo(logoInput.files[0])
      .then(function (logo) {
        var payload = collect(logo);

        if (!ENDPOINT) {
          // Not wired yet — surface a clear message rather than failing.
          console.warn("Form ENDPOINT is not set. Payload:", payload);
          throw new Error("NOT_CONFIGURED");
        }

        // text/plain avoids a CORS preflight; Apps Script reads
        // e.postData.contents. Response is opaque under no-cors, so a
        // resolved fetch is treated as success (Apps Script logs the write).
        return fetch(ENDPOINT, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
      })
      .then(function () {
        onSuccess();
      })
      .catch(function (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Entry";
        if (err && err.message === "NOT_CONFIGURED") {
          setStatus("Form isn't connected to its inbox yet. Please try again shortly.", "error");
        } else {
          setStatus("Something went wrong sending your entry. Please try again.", "error");
        }
      });
  });

  function onSuccess() {
    form.reset();
    logoName.textContent = "No file selected";
    submitBtn.textContent = "Submitted ✓";
    setStatus("Thank you — your entry has been received. We'll be in touch.", "success");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }
})();
