// ===============================
// FIREBASE IMPORTS
// ===============================
import {
  firebaseReady,
  db,
  doc,
  getDocs,
  collection,
  deleteDoc,
  updateDoc,
  addDoc,
  getDoc,
} from "./server.js";

// ===============================
// DOM ELEMENTS
// ===============================
let trainersTable;
let trainersTableHead;
let trainersTableBody;

let trainerCountEl;
let emptyState;

let connectionStatusEl;
let connectionStatusText;

let addTrainerBtn;

let trainerModal;
let closeTrainerModalBtn;

let modalTitle;
let modalTrainerBody;

// ===============================
// DATA
// ===============================
let trainers = [];

// ===============================
// DOM READY
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  // TABLE
  trainersTable = document.getElementById("trainersTable");

  trainersTableHead = trainersTable.querySelector("thead");

  trainersTableBody = trainersTable.querySelector("tbody");

  // OTHER ELEMENTS
  trainerCountEl = document.getElementById("trainerCount");

  emptyState = document.getElementById("emptyState");

  connectionStatusEl = document.getElementById("connectionStatus");

  connectionStatusText = connectionStatusEl.querySelector(".status-text");

  addTrainerBtn = document.getElementById("addTrainerBtn");

  trainerModal = document.getElementById("trainerModal");

  closeTrainerModalBtn = document.getElementById("closeTrainerModal");

  modalTitle = document.getElementById("modalTitle");

  modalTrainerBody = document.getElementById("modalTrainerBody");

  // ✅ FIXED: Moved inside DOMContentLoaded so trainersTableBody is defined
  trainersTableBody.addEventListener("click", (e) => {
    const viewBtn = e.target.closest(".btn-view");
    const editBtn = e.target.closest(".btn-edit");
    const deleteBtn = e.target.closest(".btn-delete");

    // =====================
    // VIEW TRAINER
    // =====================
    if (viewBtn) {
      const trainerId = viewBtn.dataset.id;

      openTrainerModal("Trainer Details", trainerId);

      // Wait for modal form to load then disable fields
      setTimeout(() => {
        document
          .querySelectorAll("#trainerForm input, #trainerForm textarea")
          .forEach((el) => el.setAttribute("disabled", true));
      }, 150);
    }

    // =====================
    // EDIT TRAINER
    // =====================
    if (editBtn) {
      openTrainerModal("Edit Trainer", editBtn.dataset.id);
    }

    // =====================
    // DELETE TRAINER
    // =====================
    if (deleteBtn) {
      const trainerId = deleteBtn.dataset.id;

      confirmDelete(() => {
        deleteTrainer(trainerId);
      });
    }
  });

  // INIT
  init();
});

// ===============================
// INIT
// ===============================
function init() {
  initEventListeners();

  updateConnectionStatus();

  if (firebaseReady) {
    loadTrainers();
  } else {
    document.addEventListener("firebaseReady", () => {
      loadTrainers();

      updateConnectionStatus();
    });
  }
}

// ===============================
// EVENT LISTENERS
// ===============================
function initEventListeners() {
  // ADD TRAINER
  addTrainerBtn.addEventListener("click", () => {
    openTrainerModal("Add Trainer");
  });

  // CLOSE MODAL
  closeTrainerModalBtn.addEventListener("click", closeTrainerModal);

  // CLOSE WHEN CLICK OUTSIDE
  window.addEventListener("click", (e) => {
    if (e.target === trainerModal) {
      closeTrainerModal();
    }
  });
}

// ===============================
// THEME (owned by sidebar.js – kept here as a minimal fallback only)
// ===============================

// ===============================
// CONNECTION STATUS
// ===============================
function updateConnectionStatus() {
  if (firebaseReady) {
    connectionStatusEl.classList.add("connected");

    connectionStatusText.textContent = "Database Connected";
  } else {
    connectionStatusText.textContent = "Connecting...";
  }
}

// ===============================
// OPEN MODAL
// ===============================
function openTrainerModal(title, trainerId = "") {
  modalTitle.textContent = title;

  modalTrainerBody.innerHTML = getTrainerForm(trainerId);

  // SHOW MODAL
  trainerModal.style.display = "flex";

  // FORM SUBMIT
  const form = document.getElementById("trainerForm");

  form.addEventListener("submit", saveTrainer);

  // LOAD EDIT DATA
  if (trainerId) {
    loadTrainerData(trainerId);
  }
}

// ===============================
// CLOSE MODAL
// ===============================
function closeTrainerModal() {
  trainerModal.style.display = "none";

  modalTrainerBody.innerHTML = "";
}

// ===============================
// FORM HTML
// ===============================
function getTrainerForm(trainerId = "") {
  return `
        <form id="trainerForm">

            <input
                type="hidden"
                id="trainerId"
                value="${trainerId}"
            >

            <div class="form-group">
                <label>First Name</label>
                <input
                    type="text"
                    id="firstName"
                    required
                >
            </div>

            <div class="form-group">
                <label>Middle Name</label>
                <input
                    type="text"
                    id="middleName"
                >
            </div>

            <div class="form-group">
                <label>Last Name</label>
                <input
                    type="text"
                    id="lastName"
                    required
                >
            </div>

            <div class="form-group">
                <label>School Designation</label>
                <input
                    type="text"
                    id="schoolDesig"
                >
            </div>

            <!-- NTTC -->
            <div class="form-group">
                <label>NTTC ID</label>
                <input
                    type="text"
                    id="nttc_id"
                >
            </div>

            <div class="form-group">
                <label>NTTC Date Approved</label>
                <input
                    type="date"
                    id="nttc_date_approved"
                >
            </div>

            <div class="form-group">
                <label>NTTC Expiration Date</label>
                <input
                    type="date"
                    id="nttc_expration_date"
                >
            </div>

            <!-- TMC -->
            <div class="form-group">
                <label>TMC ID</label>
                <input
                    type="text"
                    id="tmc_id"
                >
            </div>

            <div class="form-group">
                <label>TMC Date Approved</label>
                <input
                    type="date"
                    id="tmc_date_approved"
                >
            </div>

            <div class="form-group">
                <label>TMC Expiration Date</label>
                <input
                    type="date"
                    id="tmc_expration_date"
                >
            </div>

            <!-- NC -->
            <div class="form-group">
                <label>NC ID</label>
                <input
                    type="text"
                    id="nc_id"
                >
            </div>

            <div class="form-group">
                <label>National Certificate</label>
                <input
                    type="text"
                    id="National_certificate"
                >
            </div>

            <div class="form-group">
                <label>NC Date Approved</label>
                <input
                    type="date"
                    id="nc_date_approved"
                >
            </div>

            <div class="form-group">
                <label>NC Expiration Date</label>
                <input
                    type="date"
                    id="nc_expration_date"
                >
            </div>

            <div class="form-group">
                <label>Address</label>

                <textarea
                    id="address"
                    rows="3"
                    required
                ></textarea>
            </div>

            <div class="form-group">
                <label>Contact Number</label>

                <input
                    type="text"
                    id="contactNumber"
                    required
                >
            </div>

            <button
                type="submit"
                class="btn"
            >
                Save Trainer
            </button>

        </form>
    `;
}

// ===============================
// DELETE CONFIRM MODAL
// ===============================
function confirmDelete(callback) {
  const modal = document.getElementById("deleteConfirmModal");

  const confirmBtn = document.getElementById("confirmDeleteBtn");

  const cancelBtn = document.getElementById("cancelDeleteBtn");

  modal.classList.add("show");

  // CONFIRM
  confirmBtn.onclick = () => {
    modal.classList.remove("show");

    callback();
  };

  // CANCEL
  cancelBtn.onclick = () => {
    modal.classList.remove("show");
  };

  // BACKDROP CLOSE
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove("show");
    }
  };
}

// ===============================
// SAVE TRAINER
// ===============================
async function saveTrainer(e) {
  e.preventDefault();

  const trainerId = document.getElementById("trainerId").value;

  const trainerData = {
    firstName: document.getElementById("firstName").value,

    middleName: document.getElementById("middleName").value,

    lastName: document.getElementById("lastName").value,

    schoolDesig: document.getElementById("schoolDesig").value,

    // NTTC
    nttc_id: document.getElementById("nttc_id").value,

    nttc_date_approved: document.getElementById("nttc_date_approved").value,

    nttc_expration_date: document.getElementById("nttc_expration_date").value,

    // TMC
    tmc_id: document.getElementById("tmc_id").value,

    tmc_date_approved: document.getElementById("tmc_date_approved").value,

    tmc_expration_date: document.getElementById("tmc_expration_date").value,

    // NC
    nc_id: document.getElementById("nc_id").value,

    National_certificate: document.getElementById("National_certificate").value,

    nc_date_approved: document.getElementById("nc_date_approved").value,

    nc_expration_date: document.getElementById("nc_expration_date").value,

    address: document.getElementById("address").value,

    contactNumber: document.getElementById("contactNumber").value,

    updatedAt: new Date(),
  };

  try {
    // UPDATE
    if (trainerId) {
      await updateDoc(doc(db, "trainers", trainerId), trainerData);

      showToast("Trainer updated");
    } else {
      // ADD
      trainerData.createdAt = new Date();

      await addDoc(collection(db, "trainers"), trainerData);

      showToast("Trainer added");
    }

    closeTrainerModal();

    loadTrainers();
  } catch (error) {
    console.error(error);

    alert("Failed to save trainer");
  }
}

// ===============================
// LOAD TRAINERS
// ===============================
async function loadTrainers() {
  try {
    trainersTableBody.innerHTML = `
        <tr>
            <td colspan="9" class="loading-cell">
                Loading trainers...
            </td>
        </tr>
        `;

    trainers = [];

    const querySnapshot = await getDocs(collection(db, "trainers"));

    querySnapshot.forEach((docItem) => {
      trainers.push({
        id: docItem.id,

        ...docItem.data(),
      });
    });

    renderTable();
  } catch (error) {
    console.error(error);

    trainersTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="error-cell">
                    Error loading trainers
                </td>
            </tr>
            `;
  }
}

// ===============================
// RENDER TABLE
// ===============================
function renderTable() {
  trainerCountEl.textContent = `${trainers.length} trainers`;

  // EMPTY STATE
  if (trainers.length === 0) {
    emptyState.style.display = "block";

    trainersTable.style.display = "none";

    return;
  }

  emptyState.style.display = "none";

  trainersTable.style.display = "table";

  // HEADER
  trainersTableHead.innerHTML = `
        <tr>
            <th>First Name</th>
            <th>Middle Name</th>
            <th>Last Name</th>
            <th>School Designation</th>
            <th>NTTC ID</th>
            <th>TMC ID</th>
            <th>NC ID</th>
            <th>Contact</th>
            <th>Actions</th>
        </tr>
        `;

  // BODY
  trainersTableBody.innerHTML = "";

  trainers.forEach((trainer) => {
    const row = document.createElement("tr");

    row.innerHTML = `
            <td>${trainer.firstName || ""}</td>
            <td>${trainer.middleName || ""}</td>
            <td>${trainer.lastName || ""}</td>
            <td>${trainer.schoolDesig || ""}</td>
            <td>${trainer.nttc_id || ""}</td>
            <td>${trainer.tmc_id || ""}</td>
            <td>${trainer.nc_id || ""}</td>
            <td>${trainer.contactNumber || ""}</td>

            <td class="actions-cell">

                <button
                    class="icon-btn view-btn btn-view"
                    data-id="${trainer.id}"
                    title="View Details"
                >
                    <i class="fas fa-eye"></i>
                </button>

                <button
                    class="icon-btn edit-btn btn-edit"
                    data-id="${trainer.id}"
                    title="Edit"
                >
                    <i class="fas fa-pen"></i>
                </button>

                <button
                    class="icon-btn delete-btn btn-delete"
                    data-id="${trainer.id}"
                    title="Delete"
                >
                    <i class="fas fa-trash"></i>
                </button>

            </td>
            `;

    trainersTableBody.appendChild(row);
  });
}

// ===============================
// LOAD TRAINER DATA
// ===============================
async function loadTrainerData(trainerId) {
  try {
    const trainerDoc = await getDoc(doc(db, "trainers", trainerId));

    if (!trainerDoc.exists()) return;

    const trainer = trainerDoc.data();

    document.getElementById("firstName").value = trainer.firstName || "";

    document.getElementById("middleName").value = trainer.middleName || "";

    document.getElementById("lastName").value = trainer.lastName || "";

    document.getElementById("schoolDesig").value = trainer.schoolDesig || "";

    // NTTC
    document.getElementById("nttc_id").value = trainer.nttc_id || "";

    document.getElementById("nttc_date_approved").value =
      trainer.nttc_date_approved || "";

    document.getElementById("nttc_expration_date").value =
      trainer.nttc_expration_date || "";

    // TMC
    document.getElementById("tmc_id").value = trainer.tmc_id || "";

    document.getElementById("tmc_date_approved").value =
      trainer.tmc_date_approved || "";

    document.getElementById("tmc_expration_date").value =
      trainer.tmc_expration_date || "";

    // NC
    document.getElementById("nc_id").value = trainer.nc_id || "";

    document.getElementById("National_certificate").value =
      trainer.National_certificate || "";

    document.getElementById("nc_date_approved").value =
      trainer.nc_date_approved || "";

    document.getElementById("nc_expration_date").value =
      trainer.nc_expration_date || "";

    document.getElementById("address").value = trainer.address || "";

    document.getElementById("contactNumber").value =
      trainer.contactNumber || "";
  } catch (error) {
    console.error(error);
  }
}

// ===============================
// DELETE TRAINER
// ===============================
async function deleteTrainer(trainerId) {
  try {
    await deleteDoc(doc(db, "trainers", trainerId));

    showToast("Trainer deleted");

    loadTrainers();
  } catch (error) {
    console.error(error);

    alert("Delete failed");
  }
}

// ===============================
// TOAST
// ===============================
function showToast(message) {
  const toast = document.createElement("div");

  toast.className = "toast";

  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 100);

  setTimeout(() => {
    toast.classList.remove("show");

    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}