import { db, collection, getDocs, firebaseReady, getFirebaseReady } from "./server.js";

// =========================
// DOM ELEMENTS
// =========================

let filterProvince, filterRegion, filterBarangay, filterMunicipality;
let filterQualification, filterGender, filterDateStarted, filterDateFinished;
let filterDateAssessed, filterYear, filterClassification, filterNameSearch, resetBtn;
let totalEl, genderStatsEl, topQualEl, regionCountEl;
let tableHead, tableBody, emptyState;
let connectionStatusEl, connectionStatusText, statusDot;

// Dark mode elements
let sidebarThemeToggle;

let allTrainees = [];

// =========================
// INITIALIZE ELEMENTS
// =========================

function initElements() {
  filterProvince = document.getElementById("filterProvince");
  filterRegion = document.getElementById("filterRegion");
  filterBarangay = document.getElementById("filterBarangay");
  filterMunicipality = document.getElementById("filterMunicipality");
  filterQualification = document.getElementById("filterQualification");
  filterGender = document.getElementById("filterGender");
  filterDateStarted = document.getElementById("filterDateStarted");
  filterDateFinished = document.getElementById("filterDateFinished");
  filterDateAssessed = document.getElementById("filterDateAssessed");
  filterYear = document.getElementById("filterYear");
  filterClassification = document.getElementById("filterClassification");
  filterNameSearch = document.getElementById("filterNameSearch");
  resetBtn = document.getElementById("resetFilters");
  
  // Dark mode toggle
  sidebarThemeToggle = document.getElementById("sidebarThemeToggle");

  totalEl = document.getElementById("totalEnrolled");
  genderStatsEl = document.getElementById("genderStats");
  topQualEl = document.getElementById("topQualification");
  regionCountEl = document.getElementById("regionCount");

  tableHead = document.querySelector("#traineesTable thead");
  tableBody = document.querySelector("#traineesTable tbody");
  emptyState = document.getElementById("emptyState");

  connectionStatusEl = document.getElementById("connectionStatus");
  if (connectionStatusEl) {
    connectionStatusText = connectionStatusEl.querySelector(".status-text");
    statusDot = connectionStatusEl.querySelector(".status-dot");
  }

  return !!(filterRegion && filterProvince && tableHead && tableBody && emptyState);
}

// =========================
// DARK MODE (moved to js/sidebar.js – single source of truth)
// =========================

// =========================
// LOADING
// =========================

function setLoading(isLoading, message = "Loading trainees data...") {
  const overlay = document.getElementById("loadingOverlay");
  const loaderText = overlay.querySelector(".loader-text");
  if (loaderText) loaderText.textContent = message;
  document.body.classList.toggle("loading", isLoading);
  overlay.classList.toggle("show", isLoading);
}

// =========================
// FILTERS
// =========================

function decodeHTMLEntities(text) {
  if (!text) return text;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

function fillSelect(el, options) {
  const current = el.value;
  el.innerHTML = '<option value="">All</option>';
  options.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt;
    el.appendChild(option);
  });
  el.value = current;
}

function populateFilters() {
  const getUnique = (arr) =>
    [...new Set(arr)].sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { sensitivity: "base" })
    );

  const allClassifications = allTrainees.flatMap((t) => {
    const val = (t.Classification_of_Clients || "").toString();
    return val.split(/[;,]+/).map((v) => v.trim()).filter((v) => v !== "");
  });

  fillSelect(filterRegion, getUnique(allTrainees.map((t) => (t.Region || t.region || "").toString()).filter((v) => v.trim() !== "")));
  fillSelect(filterProvince, getUnique(allTrainees.map((t) => (t.Province || t.province || "").toString()).filter((v) => v.trim() !== "")));
  fillSelect(filterMunicipality, getUnique(allTrainees.map((t) => (t.Municipality || t.municipality || "").toString()).filter((v) => v.trim() !== "")));
  fillSelect(filterBarangay, getUnique(allTrainees.map((t) => (t.Barangay || t.barangay || "").toString()).filter((v) => v.trim() !== "")));
  fillSelect(filterClassification, getUnique(allClassifications));
  fillSelect(filterQualification, getUnique(allTrainees.map((t) => (t.Qualification || t.qualification || "").toString()).filter((v) => v.trim() !== "")));
  fillSelect(filterGender, getUnique(allTrainees.map((t) => (t.Gender || t.gender || "").toString()).filter((v) => v.trim() !== "")));
  fillSelect(filterYear, getUnique(allTrainees.map((t) => (t._dateFinished || "").toString().trim()).filter((d) => d.length >= 4).map((d) => d.substring(0, 4))));
  fillSelect(filterDateAssessed, getUnique(allTrainees.map((t) => t._dateAssessed || "").filter((v) => v.trim() !== "")));
}

function updateFiltersCount() {
  const activeFilters = [
    filterRegion.value, filterProvince.value, filterMunicipality.value,
    filterBarangay.value, filterClassification.value, filterQualification.value,
    filterGender.value, filterDateStarted.value, filterDateFinished.value,
    filterDateAssessed.value, filterYear.value, filterNameSearch.value
  ].filter(v => v && v.trim() !== "");
  const countEl = document.getElementById("filterCount");
  if (countEl) countEl.textContent = `${activeFilters.length} applied`;
}

function applyFilters() {
  updateFiltersCount();
  const regionVal = filterRegion.value.trim();
  const provinceVal = filterProvince.value.trim();
  const municipalityVal = filterMunicipality.value.trim();
  const barangayVal = filterBarangay.value.trim();
  const qualificationVal = filterQualification.value.trim();
  const genderVal = filterGender.value.trim();
  const classificationVal = filterClassification.value.trim();
  const dateStartedVal = filterDateStarted.value.trim();
  const dateFinishedVal = filterDateFinished.value.trim();
  const dateAssessedVal = filterDateAssessed.value.trim();
  const yearVal = filterYear.value.trim();
  const nameSearchVal = filterNameSearch.value.trim().toUpperCase();

  const filtered = allTrainees.filter((t) => {
    const r = (t.Region || t.region || "").toString().trim();
    const p = (t.Province || t.province || "").toString().trim();
    const m = (t.Municipality || t.municipality || "").toString().trim();
    const b = (t.Barangay || t.barangay || "").toString().trim();
    const q = decodeHTMLEntities(t.Qualification || t.qualification || "").toString().trim().toUpperCase();
    const g = decodeHTMLEntities(t.Gender || t.gender || "").toString().trim().toUpperCase();
    const cRaw = decodeHTMLEntities(t.Classification_of_Clients || "").toString().trim();
    const ds = (t._dateStarted || "").toString().trim();
    const df = (t._dateFinished || "").toString().trim();
    const da = (t._dateAssessed || "").toString().trim();
    const y = df ? df.substring(0, 4) : "";
    const fullName = `${(t.First_Name || "").toString().trim().toUpperCase()} ${(t.Middle_Name || "").toString().trim().toUpperCase()} ${(t.Last_Name || "").toString().trim().toUpperCase()}`;

    const classificationValues = cRaw.split(/[;,]+/).map((v) => v.trim().toUpperCase()).filter((v) => v !== "");
    const classificationMatches = !classificationVal || classificationValues.includes(classificationVal.toUpperCase());

    return (
      (!regionVal || r === regionVal) &&
      (!provinceVal || p === provinceVal) &&
      (!municipalityVal || m === municipalityVal) &&
      (!barangayVal || b === barangayVal) &&
      (!qualificationVal || q === qualificationVal.toUpperCase()) &&
      (!genderVal || g === genderVal.toUpperCase()) &&
      classificationMatches &&
      (!dateStartedVal || ds === dateStartedVal) &&
      (!dateFinishedVal || df === dateFinishedVal) &&
      (!dateAssessedVal || da === dateAssessedVal) &&
      (!yearVal || y === yearVal) &&
      (!nameSearchVal || fullName.includes(nameSearchVal))
    );
  });

  updateStats(filtered);
  renderTable(filtered);
}

function resetFilters() {
  filterRegion.value = "";
  filterProvince.value = "";
  filterMunicipality.value = "";
  filterBarangay.value = "";
  filterQualification.value = "";
  filterGender.value = "";
  filterClassification.value = "";
  filterDateStarted.value = "";
  filterDateFinished.value = "";
  filterDateAssessed.value = "";
  filterYear.value = "";
  filterNameSearch.value = "";
  updateFiltersCount();
  updateStats(allTrainees);
  renderTable(allTrainees);
}

// =========================
// STATS
// =========================

function updateStats(data = allTrainees) {
  totalEl.textContent = data.length;
  regionCountEl.textContent = new Set(data.map((t) => (t.Region || t.region || "").toString().trim()).filter(Boolean)).size;

  const hasData = data.length > 0;
  document.querySelectorAll(".stat-card").forEach((card) => {
    card.classList.toggle("has-data", hasData);
  });
  
  // Add specific styling for total enrolled and regions count
  totalEl.parentElement.classList.add('stat-total-enrolled');
  regionCountEl.parentElement.classList.add('stat-regions-covered');

  let maleCount = 0, femaleCount = 0, unknownCount = 0;
  data.forEach((t) => {
    const g = (t.Gender || t.gender || "").toString().trim().toLowerCase();
    if (g === "male" || g === "m") maleCount++;
    else if (g === "female" || g === "f") femaleCount++;
    else unknownCount++;
  });

  let genderText = "";
  if (maleCount > 0) genderText += `<i class="bi bi-person"></i> Male: ${maleCount}`;
  if (femaleCount > 0) { if (genderText) genderText += "<br>"; genderText += `<i class="bi bi-person-fill"></i> Female: ${femaleCount}`; }
  if (unknownCount > 0) { if (genderText) genderText += "<br>"; genderText += `<i class="bi bi-person-question"></i> Unknown: ${unknownCount}`; }
  genderStatsEl.innerHTML = genderText || "-";

  const qualCounts = {};
  data.forEach((t) => {
    const q = (t.Qualification || t.qualification || "").toString().trim().toUpperCase() || "Unknown";
    qualCounts[q] = (qualCounts[q] || 0) + 1;
  });
  const topQual = Object.entries(qualCounts).sort((a, b) => b[1] - a[1])[0];
  topQualEl.innerHTML = topQual
    ? `<span style="font-size:20px; font-weight:700; text-transform:uppercase;">${topQual[0]}</span><br><span style="font-size:13px; color:var(--sub)">${topQual[1].toString()} trainees</span>`
    : "-";
}

// =========================
// TABLE RENDER
// =========================

function renderTable(data) {
  if (!tableHead || !tableBody) return;

  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  if (data.length === 0) {
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  const headerKeys = [
    "ULI","CTPR","First_Name","Middle_Name","Last_Name","Extension_Name","Gender","Civil_Status","Date_of_Birth","Age","Nationality","Contact_Number","E_mail_Address","Street_No_and_Street_Address","Barangay","Municipality","Province","Region","District","Complete_Address","Classification_of_Clients","Highest_Grade_Completed","Qualification","Qualification_Program_Title","Industry_Sector_of_Qualification","Cluster","Delivery_Mode","Training_Status","Assessment_Results","Date_Started","Date_Finished","Date_Assessed","Name_of_Provider","Type_of_Provider","Classification_of_Provider","TVET_Program_Registration_Status","Type_of_Scholarships","Occupation","Employment_Status_Before_the_Training","Date_Of_Employment","Name_of_Employer","Salary","Classification","Voucher_Number","Training_Calendar_Code","_createdAt"
  ];

  // Header
  const trHead = document.createElement("tr");
  const actionTh = document.createElement("th");
  actionTh.textContent = "Action";
  tableHead.appendChild(actionTh);
  headerKeys.forEach((key) => {
    const th = document.createElement("th");
    th.textContent = key;
    tableHead.appendChild(th);
  });

  // Rows
  data.forEach((trainee) => {
    const tr = document.createElement("tr");

    // Action cell
    const actionTd = document.createElement("td");
    const viewBtn = document.createElement("button");
    viewBtn.textContent = "View";
    viewBtn.className = "btn btn-sm";
    viewBtn.style.padding = "6px 12px";
    viewBtn.style.fontSize = "12px";
    viewBtn.style.backgroundColor = "var(--primary)";
    viewBtn.style.color = "#fff";
    viewBtn.style.border = "none";
    viewBtn.style.borderRadius = "var(--radius-xs)";
    viewBtn.style.cursor = "pointer";
    viewBtn.addEventListener("click", () => openTraineeModal(trainee));
    actionTd.appendChild(viewBtn);
    tr.appendChild(actionTd);

    // Data cells
    headerKeys.forEach((key) => {
      const td = document.createElement("td");
      let val = trainee[key];
      if (val === null || val === undefined || val === "") {
        td.textContent = "-";
      } else {
        const str = String(val);
        if (
          ["Date_Started","Date_Finished","DateStarted","DateFinished","_createdAt","Date_of_Birth","Date_Assessed","Date_Of_Employment"].includes(key)
        ) {
          if (val && typeof val.toDate === "function") {
            const d = val.toDate();
            td.textContent = `${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getDate().toString().padStart(2,"0")}/${d.getFullYear()}`;
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            const [y,m,d] = str.split("-");
            td.textContent = `${m}/${d}/${y}`;
          } else if (!isNaN(Number(str)) && Number(str) > 10000 && Number(str) < 500000) {
            const epoch = new Date(1899,11,30);
            const d = new Date(epoch.getTime() + Number(str)*86400*1000);
            td.textContent = `${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getDate().toString().padStart(2,"0")}/${d.getFullYear()}`;
          } else {
            td.textContent = val;
          }
        } else if (val && typeof val.toDate === "function") {
          td.textContent = val.toDate().toLocaleString();
        } else {
          td.textContent = val;
        }
      }
      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });
}

// =========================
// MODAL
// =========================

const modalOverlay = document.getElementById("traineeModal");
const modalBody = document.getElementById("modalBody");
const closeModalBtn = document.getElementById("closeModal");

function openTraineeModal(trainee) {
  const fields = ["ULI","CTPR","First_Name","Middle_Name","Last_Name","Extension_Name","Gender","Civil_Status","Date_of_Birth","Age","Nationality","Contact_Number","E_mail_Address","Street_No_and_Street_Address","Barangay","Municipality","Province","Region","District","Complete_Address","Classification_of_Clients","Highest_Grade_Completed","Qualification","Qualification_Program_Title","Industry_Sector_of_Qualification","Cluster","Delivery_Mode","Training_Status","Assessment_Results","Date_Started","Date_Finished","Date_Assessed","Name_of_Provider","Type_of_Provider","Classification_of_Provider","TVET_Program_Registration_Status","Type_of_Scholarships","Occupation","Employment_Status_Before_the_Training","Date_Of_Employment","Name_of_Employer","Salary","Classification","Voucher_Number","Training_Calendar_Code","createdAt"];
  let html = '<div class="trainee-details-grid">';
  fields.forEach((field) => {
    let val = trainee[field];
    if (val === null || val === undefined) val = "-";
    else if (val && typeof val.toDate === "function") {
      const d = val.toDate();
      val = `${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getDate().toString().padStart(2,"0")}/${d.getFullYear()} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
    } else {
      val = String(val);
    }
    html += `<div class="detail-label">${field.replace(/_/g, " ")}</div><div class="detail-value">${val}</div>`;
  });
  html += '</div>';
  modalBody.innerHTML = html;
  modalOverlay.style.display = "flex";
}

function closeTraineeModal() {
  modalOverlay.style.display = "none";
}

closeModalBtn.addEventListener("click", closeTraineeModal);
modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) closeTraineeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeTraineeModal(); });

// =========================
// LOAD DATA
// =========================

async function loadTrainees() {
  try {
    setLoading(true);

    if (!firebaseReady) {
      setLoading(false, "Firebase not ready");
      return;
    }

    const snapshot = await getDocs(collection(db, "trainees"));

    if (snapshot.empty) {
      setLoading(false, "No trainee records found");
      return;
    }

    const getDateString = (val) => {
      if (!val) return "";
      if (val && typeof val.toDate === "function") return val.toDate().toISOString().split("T")[0];
      let str = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
      const num = Number(str);
      if (!isNaN(num) && num > 10000 && num < 500000) {
        const epoch = new Date(1899,11,30);
        return new Date(epoch.getTime() + num*86400*1000).toISOString().split("T")[0];
      }
      if (/[\/\-]/.test(str)) {
        const parts = str.split(/[\/\-]/);
        if (parts.length === 3) {
          let m,d,y;
          if (parts[0].length===4) { y=parts[0]; m=parts[1]; d=parts[2]; }
          else { m=parts[0]; d=parts[1]; y=parts[2]; }
          if (y.length===4 && m.length===2 && d.length===2) return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
        }
      }
      const dt = new Date(str);
      return !isNaN(dt.getTime()) ? dt.toISOString().split("T")[0] : "";
    };

    allTrainees = snapshot.docs.map((doc) => {
      const data = doc.data();
      if (data.Qualification_Program_Title && !data.Qualification) data.Qualification = data.Qualification_Program_Title;
      if (data.Sex && !data.Gender) data.Gender = data.Sex;
      if (data.Municipality_City && !data.Municipality) data.Municipality = data.Municipality_City;
      if (data.DateStarted && !data.Date_Started) data.Date_Started = data.DateStarted;
      if (data.DateFinished && !data.Date_Finished) data.Date_Finished = data.DateFinished;
      if (data.DateAssessed && !data.Date_Assessed) data.Date_Assessed = data.DateAssessed;

      return {
        id: doc.id,
        ...data,
        _dateStarted: getDateString(data.Date_Started),
        _dateFinished: getDateString(data.Date_Finished),
        _dateAssessed: getDateString(data.Date_Assessed),
        _createdAt: getDateString(data.createdAt || data._createdAt),
      };
    });

    setLoading(false);
    populateFilters();
    updateStats();
    renderTable(allTrainees);
  } catch (error) {
    console.error("Error loading trainees:", error);
    setLoading(false);
  }
}

// =========================
// EVENT LISTENERS
// =========================

function initEventListeners() {
  filterRegion.addEventListener("change", applyFilters);
  filterProvince.addEventListener("change", applyFilters);
  filterMunicipality.addEventListener("change", applyFilters);
  filterBarangay.addEventListener("change", applyFilters);
  filterClassification.addEventListener("change", applyFilters);
  filterQualification.addEventListener("change", applyFilters);
  filterGender.addEventListener("change", applyFilters);
  filterDateStarted.addEventListener("change", applyFilters);
  filterDateFinished.addEventListener("change", applyFilters);
  filterDateAssessed.addEventListener("change", applyFilters);
  filterYear.addEventListener("change", applyFilters);
  filterNameSearch.addEventListener("input", applyFilters);
  resetBtn.addEventListener("click", resetFilters);
}

// =========================
// INITIALIZATION
// =========================

let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 500;

function updateConnectionStatus() {
  if (!connectionStatusEl) return;

  const isReady = getFirebaseReady();

  if (isReady) {
    connectionStatusEl.classList.remove("error");
    connectionStatusEl.classList.add("connected");
    if (connectionStatusText) connectionStatusText.textContent = "Database Connected";
  } else {
    connectionStatusEl.classList.remove("connected");
    if (connectionStatusText) connectionStatusText.textContent = "Connecting...";
  }
}

function initDashboard() {
  const ready = getFirebaseReady();

  if (!initElements()) {
    return;
  }

  initEventListeners();

  // Update connection status
  updateConnectionStatus();

  if (ready === true) {
    loadTrainees();
  } else if (initAttempts >= MAX_INIT_ATTEMPTS) {
    if (connectionStatusEl) {
      connectionStatusEl.classList.add("error");
      if (connectionStatusText) connectionStatusText.textContent = "Connection Failed";
    }
    setLoading(false, "Connection timeout - check Firebase config");
  } else {
    initAttempts++;
    setTimeout(initDashboard, 100);
  }
}

document.addEventListener("firebaseReady", () => {
  updateConnectionStatus();
  if (allTrainees.length === 0) {
    loadTrainees();
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDashboard);
} else {
  initDashboard();
}
