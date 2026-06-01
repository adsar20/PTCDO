// ===============================
// FIREBASE IMPORTS
// ===============================
import {
  firebaseReady,
  db,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "./server.js";

// ===============================
// EMAILJS
// ===============================
//
// ADD IN HTML:
//
// <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
//
// <script>
// emailjs.init("YOUR_PUBLIC_KEY");
// </script>
//
// ===============================

// ===============================
// ELEMENT REFERENCES
// ===============================
const deleteConfirmModal = document.getElementById("deleteConfirmModal");

const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

let deleteTarget = null;
let editingEvent = null; // { event, index, dayEvents, dateKey }

const calendarDays = document.getElementById("calendarDays");

const monthYear = document.getElementById("monthYear");

const prevBtn =
  document.getElementById("prevMonth") || document.getElementById("prevBtn");

const nextBtn =
  document.getElementById("nextMonth") || document.getElementById("nextBtn");

const eventsContainer =
  document.getElementById("eventsList") ||
  document.getElementById("eventsContainer");

const selectedDateText = document.getElementById("selectedDateText");

// SIMPLE FORM
const addEventBtn = document.getElementById("addEventBtn");

const eventTitle = document.getElementById("eventTitle");

const eventDesc = document.getElementById("eventDesc");

// MODAL
const modal = document.getElementById("addEventModal");

const openModalBtn = document.getElementById("openAddEventModal");

const closeModalBtn = document.getElementById("closeAddEventModal");

const modalTitle = document.getElementById("modalEventTitle");

const modalDesc = document.getElementById("modalEventDesc");

const modalEmail = document.getElementById("modalEventEmail");

const modalDateTime = document.getElementById("modalEventDateTime");

const saveEventBtn = document.getElementById("saveEventBtn");

// ===============================
// VARIABLES
// ===============================
let currentDate = new Date();

let selectedDate = null;

let events = {};

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  await loadEventsFromFirebase();

  renderCalendar();

  startEventReminderChecker();
});

// ===============================
// SAVE EVENT TO FIREBASE
// ===============================
async function saveEventToFirebase(eventData) {
   try {
     const docRef = await addDoc(collection(db, "calendar_events"), eventData);

     console.log("Event saved");

     return docRef.id;
   } catch (error) {
     console.error("Firebase Save Error:", error);

     return null;
   }
 }

// ===============================
// UPDATE EVENT IN FIREBASE
// ===============================
async function updateEventFirebase(eventId, updates) {
  try {
    await updateDoc(doc(db, "calendar_events", eventId), updates);
    console.log("Event updated");
    return true;
  } catch (error) {
    console.error("Firebase Update Error:", error);
    return false;
  }
}

// ===============================
// LOAD EVENTS FROM FIREBASE
// ===============================
async function loadEventsFromFirebase() {
  try {
    events = {};

    const querySnapshot = await getDocs(collection(db, "calendar_events"));

    querySnapshot.forEach((docItem) => {
      const data = docItem.data();

      const dateKey = data.dateKey;

      if (!events[dateKey]) {
        events[dateKey] = [];
      }

      events[dateKey].push({
        id: docItem.id,

        title: data.title,

        description: data.description,

        email: data.email,

        notifyDateTime: data.notifyDateTime,

        notified: data.notified || false,
      });
    });
  } catch (error) {
    console.error("Load Events Error:", error);
  }
}

// ===============================
// SEND EMAIL
// ===============================
async function sendEmailNotification(eventData) {
  try {
    await emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
      to_email: eventData.email,

      event_title: eventData.title,

      event_description: eventData.description,

      event_date: eventData.notifyDateTime,
    });

    console.log("Email sent");
  } catch (error) {
    console.error("Email Error:", error);
  }
}

// ===============================
// START REMINDER CHECKER
// ===============================
function startEventReminderChecker() {
  setInterval(async () => {
    const now = new Date().getTime();

    Object.keys(events).forEach(async (dateKey) => {
      events[dateKey].forEach(async (event) => {
        if (!event.notifyDateTime || event.notified) return;

        const notifyTime = new Date(event.notifyDateTime).getTime();

        if (now >= notifyTime) {
          await sendEmailNotification(event);

          event.notified = true;

          try {
            await updateDoc(doc(db, "calendar_events", event.id), {
              notified: true,
            });
          } catch (err) {
            console.error("Update notify status error:", err);
          }

          console.log("Reminder sent");
        }
      });
    });
  }, 60000);
}

// ===============================
// FORMAT DATE
// ===============================
function formatDateKey(year, month, day) {
  return `${year}-${month + 1}-${day}`;
}

// ===============================
// HIGHLIGHT SELECTED DATE
// ===============================
function highlightSelectedDate(selectedDiv) {
  const allDays = document.querySelectorAll(".calendar-day, .day");

  allDays.forEach((day) => {
    if (!day.classList.contains("other-month")) {
      day.classList.remove("selected");
    }
  });

  selectedDiv.classList.add("selected");
}

// ===============================
// RENDER CALENDAR
// ===============================
function renderCalendar() {
  if (!calendarDays) return;

  calendarDays.innerHTML = "";

  const year = currentDate.getFullYear();

  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();

  const lastDate = new Date(year, month + 1, 0).getDate();

  const prevLastDate = new Date(year, month, 0).getDate();

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  monthYear.textContent = `${months[month]} ${year}`;

  // PREVIOUS MONTH DAYS
  for (let i = firstDay; i > 0; i--) {
    const div = document.createElement("div");

    div.className = calendarDays.classList.contains("days")
      ? "day other-month"
      : "calendar-day other-month";

    div.innerHTML = `
            <div class="day-number">
                ${prevLastDate - i + 1}
            </div>
        `;

    calendarDays.appendChild(div);
  }

  // CURRENT MONTH DAYS
  for (let day = 1; day <= lastDate; day++) {
    const div = document.createElement("div");

    div.className = calendarDays.classList.contains("days")
      ? "day"
      : "calendar-day";

    const today = new Date();

    if (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    ) {
      div.classList.add("today");
    }

    const dateKey = formatDateKey(year, month, day);

    let eventsHTML = "";

    if (events[dateKey]) {
      events[dateKey].slice(0, 2).forEach((event) => {
        eventsHTML += `
                    <div class="event">
                        <span class="event-text">
                            ${event.title}
                        </span>
                    </div>
                `;
      });
    }

    div.innerHTML = `
            <div class="day-number">
                ${day}
            </div>

            ${eventsHTML}
        `;

    div.addEventListener("click", () => {
      selectedDate = {
        year,
        month,
        day,
      };

      if (selectedDateText) {
        selectedDateText.textContent = `Selected: ${months[month]} ${day}, ${year}`;
      }

      renderEvents(dateKey);

      highlightSelectedDate(div);
    });

    calendarDays.appendChild(div);
  }
}

// ===============================
// RENDER EVENTS
// ===============================
function renderEvents(dateKey) {
  if (!eventsContainer) return;

  const dayEvents = events[dateKey] || [];

  if (dayEvents.length === 0) {
    eventsContainer.innerHTML = `
            <div class="empty">
                No events
            </div>
            `;

    return;
  }

  eventsContainer.innerHTML = "";

  dayEvents.forEach((event, index) => {
    const div = document.createElement("div");

    div.className = "event-item";

     div.innerHTML = `
                 <h4>
                     ${event.title}
                 </h4>

                 <p>
                     ${event.description}
                 </p>

                 <small>
                     ${event.email || ""}
                 </small>

                 <br>

                 <small>
                     Reminder:
                     ${
                       event.notifyDateTime
                         ? new Date(event.notifyDateTime).toLocaleString()
                         : "No reminder"
                     }
                 </small>

                 <br><br>

                 <button
                     class="edit-event-btn"
                     data-id="${event.id}"
                 >
                     <i class="bi bi-pencil"></i> Edit
                 </button>
                 <button
                     class="delete-event-btn"
                     data-id="${event.id}"
                 >
                     <i class="bi bi-trash"></i> Delete
                 </button>
             `;

     const deleteBtn = div.querySelector(".delete-event-btn");
     const editBtn = div.querySelector(".edit-event-btn");

     deleteBtn.addEventListener("click", () => {
       deleteTarget = {
         event,
         index,
         dayEvents,
         dateKey,
       };

       deleteConfirmModal.classList.add("active");
     });

     editBtn.addEventListener("click", () => {
       // Set editing state
       editingEvent = {
         event,
         index,
         dayEvents,
         dateKey,
       };

       // Populate modal with event data
       modalTitle.value = event.title;
       modalDesc.value = event.description;
       modalEmail.value = event.email || "";

       // Set the time picker if notifyDateTime exists
       if (event.notifyDateTime) {
         const date = new Date(event.notifyDateTime);
         const hours = date.getHours().toString().padStart(2, '0');
         const minutes = date.getMinutes().toString().padStart(2, '0');
         modalDateTime.value = `${hours}:${minutes}`;
       } else {
         modalDateTime.value = "";
       }

       // Change modal title and save button text
       const modalHeader = modal.querySelector(".modal-header h3");
       if (modalHeader) {
         modalHeader.textContent = "Edit Event";
       }
       saveEventBtn.textContent = "Update Event";

       // Open modal
       modal.classList.add("active");
       modalTitle.focus();
     });

    eventsContainer.appendChild(div);
  });
}

// ===============================
// ADD NEW EVENT
// ===============================
async function addNewEvent(title, description, email, notifyDateTime) {
  if (!selectedDate) {
    showNotification("Please select a date first", "error");
    return;
  }

  const dateKey = formatDateKey(
    selectedDate.year,
    selectedDate.month,
    selectedDate.day,
  );

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const fullDate = `${months[selectedDate.month]} ${selectedDate.day}, ${selectedDate.year}`;

  const eventData = {
    title,
    description,
    email,
    notifyDateTime,
    dateKey,
    fullDate,
    notified: false,
    createdAt: new Date(),
  };

  const firebaseId = await saveEventToFirebase(eventData);
   
  if (firebaseId) {
    eventData.id = firebaseId;
    
    if (!events[dateKey]) {
      events[dateKey] = [];
    }

    events[dateKey].push(eventData);

    renderEvents(dateKey);
    renderCalendar();

    showNotification("Event added successfully!", "success");
  } else {
    showNotification("Failed to add event", "error");
  }
}

// ===============================
// PREVIOUS MONTH
// ===============================
if (prevBtn) {
  prevBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);

    renderCalendar();
  });
}

// ===============================
// NEXT MONTH
// ===============================
if (nextBtn) {
  nextBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);

    renderCalendar();
  });
}

// ===============================
// SIMPLE FORM
// ===============================
if (addEventBtn) {
  addEventBtn.addEventListener("click", async () => {
    const title = eventTitle.value.trim();

    const description = eventDesc.value.trim();

    if (!title) {
      showNotification("Please enter title", "error");

      return;
    }

    await addNewEvent(title, description, "", "");

    eventTitle.value = "";

    eventDesc.value = "";
  });
}

// ===============================
// MODAL
// ===============================
if (modal && openModalBtn) {
  openModalBtn.addEventListener("click", () => {
    if (!selectedDate) {
      showNotification("Please select a date first", "error");
      return;
    }

    // Reset editing state (in case we were editing)
    editingEvent = null;
    // Reset modal to add mode
    const modalHeader = modal.querySelector(".modal-header h3");
    if (modalHeader) {
      modalHeader.textContent = "Add Event";
    }
    saveEventBtn.textContent = "Save Event";

    modal.classList.add("active");
    modalTitle.focus();
  });

  closeModalBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

// ===============================
// SAVE EVENT BUTTON
// ===============================
if (saveEventBtn) {
    saveEventBtn.addEventListener("click", async () => {
     const title = modalTitle.value.trim();
     const description = modalDesc.value.trim();
     const email = modalEmail.value.trim();

     // ===============================
     // TIME ONLY REMINDER
     // ===============================
     let notifyDateTime = "";

     if (modalDateTime.value) {
       const selected = new Date(
         selectedDate.year,
         selectedDate.month,
         selectedDate.day,
       );

       const [hours, minutes] = modalDateTime.value.split(":");
       selected.setHours(hours);
       selected.setMinutes(minutes);
       selected.setSeconds(0);

       notifyDateTime = selected.toISOString();
     }

     if (!title) {
       showNotification("Please enter event title", "error");
       return;
     }

     if (editingEvent) {
       // Update existing event
       const { event, index, dayEvents, dateKey } = editingEvent;
       const updates = {
         title,
         description,
         email,
         notifyDateTime,
       };

       const success = await updateEventFirebase(event.id, updates);
       if (success) {
         // Update the local events array
         dayEvents[index] = {
           ...dayEvents[index],
           title,
           description,
           email,
           notifyDateTime,
         };

         renderEvents(dateKey);
         renderCalendar();
         showNotification("Event updated successfully!", "success");
       } else {
         showNotification("Update failed", "error");
       }

       // Reset editing state
       editingEvent = null;
       // Reset modal to add mode
       const modalHeader = modal.querySelector(".modal-header h3");
       if (modalHeader) {
         modalHeader.textContent = "Add Event";
       }
       saveEventBtn.textContent = "Save Event";
     } else {
       // Add new event
       await addNewEvent(title, description, email, notifyDateTime);
     }

     closeModal();
   });
}

// ===============================
// DELETE CONFIRM MODAL
// ===============================
if (confirmDeleteBtn && cancelDeleteBtn) {
  confirmDeleteBtn.addEventListener("click", async () => {
    if (!deleteTarget) return;

    const { event, index, dayEvents, dateKey } = deleteTarget;

    try {
      await deleteDoc(doc(db, "calendar_events", event.id));

      dayEvents.splice(index, 1);

      if (dayEvents.length === 0) {
        delete events[dateKey];
      }

      renderEvents(dateKey);

      renderCalendar();

      showNotification("Event deleted successfully!", "success");

      // If we were editing the deleted event, reset editing state
      if (editingEvent && editingEvent.event.id === event.id) {
        editingEvent = null;
        // Reset modal to add mode if it's open
        if (modal.classList.contains("active")) {
          const modalHeader = modal.querySelector(".modal-header h3");
          if (modalHeader) {
            modalHeader.textContent = "Add Event";
          }
          saveEventBtn.textContent = "Save Event";
        }
      }
    } catch (error) {
      console.error(error);

      showNotification("Delete failed", "error");
    }

    deleteConfirmModal.classList.remove("active");

    deleteTarget = null;
  });

  cancelDeleteBtn.addEventListener("click", () => {
    deleteConfirmModal.classList.remove("active");

    deleteTarget = null;
  });

  deleteConfirmModal.addEventListener("click", (e) => {
    if (e.target === deleteConfirmModal) {
      deleteConfirmModal.classList.remove("active");

      deleteTarget = null;
    }
  });
}

// ===============================
// CLOSE MODAL
// ===============================
function closeModal() {
  modal.classList.remove("active");

  modalTitle.value = "";
  modalDesc.value = "";
  modalEmail.value = "";
  modalDateTime.value = "";

  // Reset editing state
  editingEvent = null;

  // Reset modal header and button text to add mode
  const modalHeader = modal.querySelector(".modal-header h3");
  if (modalHeader) {
    modalHeader.textContent = "Add Event";
  }
  saveEventBtn.textContent = "Save Event";
}

// ===============================
// NOTIFICATION
// ===============================
function showNotification(message, type = "success") {
  const notification = document.createElement("div");

  notification.className = `custom-notification ${type}`;

  notification.innerHTML = `
        <div class="notification-content">
            ${message}
        </div>
    `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("show");
  }, 100);

  setTimeout(() => {
    notification.classList.remove("show");

    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// ===============================
// INITIAL RENDER
// ===============================
renderCalendar();
