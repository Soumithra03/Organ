"use strict";

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Who can donate blood to each recipient group
const CAN_RECEIVE_FROM = {
  "A+":  ["A+", "A-", "O+", "O-"],
  "A-":  ["A-", "O-"],
  "B+":  ["B+", "B-", "O+", "O-"],
  "B-":  ["B-", "O-"],
  "AB+": GROUPS,
  "AB-": ["A-", "B-", "AB-", "O-"],
  "O+":  ["O+", "O-"],
  "O-":  ["O-"]
};

const STORE_KEY = "lifelink_donors_v1";

const SEED = [
  { id: 1, name: "Arun Kumar",    age: 29, group: "O+",  organ: "Blood",       city: "Chennai",    phone: "9840000001" },
  { id: 2, name: "Meena Iyer",    age: 34, group: "A+",  organ: "Kidney",      city: "Chennai",    phone: "9840000002" },
  { id: 3, name: "Farhan Ali",    age: 41, group: "B+",  organ: "Liver",       city: "Coimbatore", phone: "9840000003" },
  { id: 4, name: "Lakshmi Devi",  age: 52, group: "O-",  organ: "Cornea",      city: "Madurai",    phone: "9840000004" },
  { id: 5, name: "Rahul Menon",   age: 26, group: "AB+", organ: "Bone marrow", city: "Chennai",    phone: "9840000005" },
  { id: 6, name: "Priya Nair",    age: 31, group: "A-",  organ: "Blood",       city: "Bengaluru",  phone: "9840000006" }
];

/* ---------- Storage (guarded: may be unavailable) ---------- */
function loadDonors() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* fall through to seed */ }
  return SEED.slice();
}
function saveDonors() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(donors)); } catch (e) { /* ignore */ }
}

let donors = loadDonors();

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;   // textContent keeps user input safe
  return node;
}

function toast(message) {
  const t = $("toast");
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 2800);
}

/* ---------- Build blood group picker and select ---------- */
const picker = $("groupPicker");
GROUPS.forEach((g) => {
  const label = el("label");
  const input = el("input");
  input.type = "radio";
  input.name = "needGroup";
  input.value = g;
  input.setAttribute("aria-label", "Blood group " + g);
  label.append(input, el("span", "", g));
  picker.append(label);
});

GROUPS.forEach((g) => {
  const opt = el("option", "", g);
  opt.value = g;
  $("dGroup").append(opt);
});

/* ---------- Render results ---------- */
function renderDonors(list, title) {
  $("resultsTitle").textContent = title;
  const box = $("resultsList");
  box.replaceChildren();

  if (!list.length) {
    box.append(el("div", "empty", "No donors match yet. Try another city, turn on compatible groups, or choose “Any” for the donation type."));
    return;
  }

  list.forEach((d) => {
    const card = el("article", "donor");
    card.append(el("div", "badge", d.group));

    const info = el("div");
    info.append(el("h3", "", d.name));
    const p = el("p");
    p.append(el("span", "tag", d.organ));
    p.append(document.createTextNode(d.city + " · Age " + d.age));
    info.append(p);
    card.append(info);

    const actions = el("div", "actions");
    const btn = el("button", "btn ghost", "Show contact");
    btn.type = "button";
    btn.addEventListener("click", () => {
      const link = el("a", "phone", d.phone);
      link.href = "tel:" + d.phone;
      btn.replaceWith(link);
    });
    actions.append(btn);
    card.append(actions);

    box.append(card);
  });
}

/* ---------- Finder ---------- */
$("finderForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const chosen = document.querySelector('input[name="needGroup"]:checked');
  const organ  = $("fOrgan").value;
  const city   = $("fCity").value.trim().toLowerCase();
  const compat = $("fCompat").checked;

  let allowed = GROUPS;
  if (chosen) allowed = compat ? CAN_RECEIVE_FROM[chosen.value] : [chosen.value];

  const results = donors.filter((d) => {
    const groupOk = !chosen || allowed.includes(d.group);
    const organOk = !organ || d.organ === organ;
    const cityOk  = !city || d.city.toLowerCase().includes(city);
    return groupOk && organOk && cityOk;
  });

  const title = results.length + (results.length === 1 ? " donor found" : " donors found");
  renderDonors(results, title);
  document.querySelector(".results").scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ---------- Registration ---------- */
function setError(id, message) {
  const field = $(id);
  const err = document.querySelector('.err[data-for="' + id + '"]');
  if (err) err.textContent = message || "";
  if (field && field.type !== "checkbox") field.classList.toggle("invalid", Boolean(message));
}

function validate() {
  let ok = true;
  const name  = $("dName").value.trim();
  const age   = Number($("dAge").value);
  const phone = $("dPhone").value.replace(/\s+/g, "");

  const rules = [
    ["dName",    name.length >= 2,                    "Enter your full name."],
    ["dAge",     age >= 18 && age <= 65,              "Donors must be between 18 and 65."],
    ["dGroup",   $("dGroup").value !== "",            "Choose your blood group."],
    ["dOrgan",   $("dOrgan").value !== "",            "Choose what you will donate."],
    ["dCity",    $("dCity").value.trim().length >= 2, "Enter your city."],
    ["dPhone",   /^[6-9]\d{9}$/.test(phone),          "Enter a 10-digit Indian mobile number."],
    ["dConsent", $("dConsent").checked,               "Please agree so recipients can contact you."]
  ];

  rules.forEach(([id, pass, msg]) => {
    setError(id, pass ? "" : msg);
    if (!pass) ok = false;
  });
  return ok;
}

$("donorForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!validate()) return;

  const donor = {
    id: Date.now(),
    name: $("dName").value.trim(),
    age: Number($("dAge").value),
    group: $("dGroup").value,
    organ: $("dOrgan").value,
    city: $("dCity").value.trim(),
    phone: $("dPhone").value.replace(/\s+/g, "")
  };

  donors.unshift(donor);
  saveDonors();
  e.target.reset();
  renderDonors(donors, "Registered donors");
  toast("Thank you, " + donor.name.split(" ")[0] + ". You are registered.");
});

/* ---------- Initial view ---------- */
renderDonors(donors, "Registered donors");