// Import Firebase connection from server.js
import { firebaseReady, db, doc, setDoc, serverTimestamp, collection, getDocs } from './server.js';

// =========================
// ELEMENTS
// =========================

const fileInput = document.getElementById("fileInput");
const fileBadge = document.getElementById("fileBadge");

const uploadButton = document.getElementById("uploadFirebaseBtn");
const chooseFileBtn = document.getElementById("chooseFileBtn");
const statusMessage = document.getElementById("statusMessage");

let previewData = [];

// =========================
// DARK MODE (moved to js/sidebar.js – single source of truth)
// =========================

// =========================
// LOADING
// =========================

const loadingOverlay = document.getElementById("loadingOverlay");

function setLoading(isLoading, message = "") {

    if (isLoading) {

        uploadButton.disabled = true;
        uploadButton.innerHTML = "Uploading...";
        loadingOverlay.classList.add("show");

    } else {

        uploadButton.disabled = false;
        uploadButton.innerHTML = "Upload to Database";
        loadingOverlay.classList.remove("show");
    }

    statusMessage.textContent = message;
}

// =========================
// CONNECTION STATUS (Topbar and Import Card)
// =========================

let connectionState = 'connecting'; // 'connecting', 'connected', 'error'

const connectionStatusEl = document.getElementById("connectionStatus");
const connectionStatusText = connectionStatusEl?.querySelector(".status-text");
const connectionStatusImportEl = document.getElementById("connectionStatusImport");
const connectionStatusImportText = connectionStatusImportEl?.querySelector(".status-text");

function updateConnectionStatus() {
    // Update topbar connection status
    if (connectionStatusEl) {
        connectionStatusEl.classList.remove("connected", "error");
        if (connectionState === "connected") {
            connectionStatusEl.classList.add("connected");
            if (connectionStatusText) connectionStatusText.textContent = "Database Connected";
        } else if (connectionState === "error") {
            connectionStatusEl.classList.add("error");
            if (connectionStatusText) connectionStatusText.textContent = "Connection Error";
        } else {
            // connecting
            if (connectionStatusText) connectionStatusText.textContent = "Connecting...";
        }
    }

    // Update import card connection status
    if (connectionStatusImportEl) {
        connectionStatusImportEl.classList.remove("connected", "error");
        if (connectionState === "connected") {
            connectionStatusImportEl.classList.add("connected");
            if (connectionStatusImportText) connectionStatusImportText.textContent = "Database Connected";
        } else if (connectionState === "error") {
            connectionStatusImportEl.classList.add("error");
            if (connectionStatusImportText) connectionStatusImportText.textContent = "Connection Error";
        } else {
            // connecting
            if (connectionStatusImportText) connectionStatusImportText.textContent = "Connecting...";
        }
    }
}

// Listen for Firebase ready event
document.addEventListener("firebaseReady", () => {
    connectionState = "connected";
    updateConnectionStatus();
    setLoading(false, "Database connected. Ready to upload.");
});

// Listen for Firebase error event
document.addEventListener("firebaseError", () => {
    connectionState = "error";
    updateConnectionStatus();
    setLoading(false, "Database connection failed. Check your internet connection.");
});

// Initial paint
updateConnectionStatus();

// =========================
// FILE IMPORT
// =========================

chooseFileBtn.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", (e) => {

    const file = e.target.files[0];

    if (!file) {
        fileBadge.textContent = "No file selected";
        return;
    }

    fileBadge.textContent = file.name;

    const reader = new FileReader();

    reader.onload = function (event) {

        const file = e.target.files[0];
        const fileName = file ? file.name.toLowerCase() : '';

        // Stop if image file
        if (fileName.endsWith('.png') || fileName.endsWith('.jpg') ||
            fileName.endsWith('.jpeg') || fileName.endsWith('.gif') ||
            fileName.endsWith('.webp') || fileName.endsWith('.bmp')) {

            alert("Image files are not supported. Please select an Excel file (.xlsx or .xls).");
            fileInput.value = '';
            fileBadge.textContent = "No file selected";
            statusMessage.textContent = "Waiting for Excel file...";
            return;
        }

        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, {
                type: 'array'
            });

            console.log("Workbook loaded, sheets:", workbook.SheetNames);

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            let jsonData = XLSX.utils.sheet_to_json(
                worksheet,
                { header: 1 }
            );

            // Map field names using a mapping object (keys: lowercase, no spaces)
            const fieldMappings = {
                'qualificationprogramtitle': 'Qualification',
                'sex': 'Gender',
                'municipalitycity': 'Municipality',
                'province': 'Province',
                'datestarted': 'Date_Started',
                'date_started': 'Date_Started',
                'datefinished': 'Date_Finished',
                'date_finished': 'Date_Finished'
            };

            if (jsonData.length > 0 && jsonData[0]) {
                const header = jsonData[0];
                let normalizedHeader = header.map(h => {
                    const key = String(h || '').trim().toLowerCase().replace(/\s+/g, '');
                    return fieldMappings[key] || h;
                });
                jsonData[0] = normalizedHeader;
            }

            previewData = jsonData;
            renderTable(jsonData);

            const rowCount = document.querySelectorAll("#excelTable tbody tr").length;
            if (rowCount === 0) {
                statusMessage.textContent = "No data rows found before processing markers";
            } else {
                statusMessage.textContent = "Excel File Loaded Successfully";
            }

        } catch (error) {
            console.error("Error parsing file:", error);
            alert("Error reading file. Please ensure it's a valid Excel file.");
            fileInput.value = '';
            fileBadge.textContent = "No file selected";
            previewData = [];
            statusMessage.textContent = "Waiting for Excel file...";
        }
    };

    reader.readAsArrayBuffer(file);
});

// =========================
// FIREBASE SAVE
// =========================

uploadButton.addEventListener("click", async () => {

    if (!firebaseReady) {
        alert("Firebase not connected");
        return;
    }

    setLoading(true, "Processing data...");

    try {

        const stopKeywords = [
            'still reading'
        ];

        const isStopRow = (row) => {
            const rowText = row.map(c => String(c || '').toLowerCase().trim()).join(' ');
            // Signature block marker: both "prepared by:" and "approved by:" in same row
            if (rowText.includes('prepared by:') && rowText.includes('approved by:')) {
                return true;
            }
            // "still reading" marker in any cell
            return row.some(cell => {
                const t = String(cell || '').toLowerCase().trim();
                return stopKeywords.some(kw => t.includes(kw));
            });
        };

        // Find first non-empty row as header
        let headers = null;
        let dataStartIdx = -1;
        for (let i = 0; i < previewData.length; i++) {
            const row = previewData[i];
            const hasContent = row.some(cell => {
                const t = String(cell || '').trim();
                return t !== '';
            });
            if (hasContent) {
                // Normalize header using field mappings
                const fieldMappings = {
                    'qualificationprogramtitle': 'Qualification',
                    'sex': 'Gender',
                    'municipalitycity': 'Municipality',
                    'province': 'Province',
                    'datestarted': 'Date_Started',
                    'date_started': 'Date_Started',
                    'datefinished': 'Date_Finished',
                    'date_finished': 'Date_Finished'
                };
                headers = row.map(h => {
                    const key = String(h || '').trim().toLowerCase().replace(/\s+/g, '');
                    return fieldMappings[key] || h;
                });
                dataStartIdx = i + 1;
                break;
            }
        }

        if (!headers) {
            alert("No valid header row found");
            setLoading(false, "No data to upload");
            return;
        }

        let successCount = 0;
        let duplicateCount = 0;
        let hasData = false;

        // Fetch existing trainees for duplicate checking
        const existingTrainees = [];
        const querySnapshot = await getDocs(collection(db, "trainees"));
        querySnapshot.forEach((doc) => {
            existingTrainees.push(doc.data());
        });

        // const isDuplicate = (row, headers) => {
        //     const keyFields = ['Qualification', 'Gender', 'Municipality', 'Province', 'Date_Started'];
        //     let hasAllKeyFields = true;
        //     for (const field of keyFields) {
        //         const headerIdx = headers.findIndex(h => String(h).toLowerCase().replace(/\s+/g, '_') === field.toLowerCase());
        //         if (headerIdx === -1) {
        //             hasAllKeyFields = false;
        //             break;
        //         }
        //     }
        //     if (!hasAllKeyFields) return false;
        //     for (const trainee of existingTrainees) {
        //         let match = true;
        //         for (const field of keyFields) {
        //             const headerIdx = headers.findIndex(h => String(h).toLowerCase().replace(/\s+/g, '_') === field.toLowerCase());
        //             if (String(trainee[field] || '').trim() !== String(row[headerIdx] || '').trim()) {
        //                 match = false;
        //                 break;
        //             }
        //         }
        //         if (match) return true;
        //     }
        //     return false;
        // };

        // Process rows until a stop row is encountered
        for (let i = dataStartIdx; i < previewData.length; i++) {
            const row = previewData[i];

            if (isStopRow(row)) {
                console.log(`Stopped at row ${i}: stop marker reached - reading complete`);
                break;
            }

            // Skip empty rows
            const rowHasData = row.some(cell => {
                const t = String(cell || '').trim();
                return t !== '';
            });
            if (!rowHasData) continue;

            // Check for duplicate based on key fields
           // if (isDuplicate(row, headers)) {
              //  duplicateCount++;
             //   continue;
           // }

            hasData = true;

            const traineeId = `trainee_${Date.now()}_${i}`;
            const traineeData = {};

            headers.forEach((header, index) => {
                let field = String(header).trim();
                // Normalize field name using mapping (case-insensitive, ignore spaces)
                const key = field.toLowerCase().replace(/\s+/g, '');
                const mapping = {
                    'qualificationprogramtitle': 'Qualification',
                    'sex': 'Gender',
                    'municipalitycity': 'Municipality',
                    'province': 'Province',
                    'datestarted': 'Date_Started',
                    'date_started': 'Date_Started',
                    'datefinished': 'Date_Finished',
                    'date_finished': 'Date_Finished'
                };
                field = mapping[key] || field;
                // Replace spaces with underscores for field name
                field = field.replace(/\s+/g, "_");
                traineeData[field] = row[index] || "";
            });

            traineeData.createdAt = serverTimestamp();

            await setDoc(
                doc(db, "trainees", traineeId),
                traineeData
            );

            console.log("Saved trainee:", traineeId, traineeData);
            successCount++;
        }

        if (!hasData) {
            setLoading(false, "No data rows to upload (Duplicated file, already uploaded)");
            return;
        }

        setLoading(
            false,
            `Upload Completed! ${successCount} record(s) saved.${duplicateCount > 0 ? ` ${duplicateCount} duplicate(s) skipped.` : ''}`
        );

        // Clear temporary data
        previewData = [];
        fileInput.value = '';
        fileBadge.textContent = "No file selected";

        // Clear table display
        renderTable([]);

        // Reset counts
        const rowCountEl = document.getElementById("rowCount");
        const columnCountEl = document.getElementById("columnCount");
        if (rowCountEl) rowCountEl.textContent = 0;
        if (columnCountEl) columnCountEl.textContent = 0;
        uploadButton.disabled = true;

        document
            .querySelector(".table-container")
            .classList.add("success");

        setTimeout(() => {
            document
                .querySelector(".table-container")
                .classList.remove("success");
        }, 500);

    } catch (error) {
        console.error(error);
        setLoading(
            false,
            "Upload Failed: " + error.message
        );
    }
});

// =========================
// TABLE RENDER
// =========================

function renderTable(data) {
    const thead = document.querySelector("#excelTable thead");
    const tbody = document.querySelector("#excelTable tbody");
    thead.innerHTML = "";
    tbody.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
        document.getElementById("rowCount").textContent = 0;
        document.getElementById("columnCount").textContent = 0;
        uploadButton.disabled = true;
        return;
    }

    const stopKeywords = ['still reading'];
    const isStopRow = (row) => {
        const rowText = row.map(c => String(c || '').toLowerCase().trim()).join(' ');
        if (rowText.includes('prepared by:') && rowText.includes('approved by:')) {
            return true;
        }
        return row.some(cell => {
            const t = String(cell || '').toLowerCase().trim();
            return stopKeywords.some(kw => t.includes(kw));
        });
    };

    let headerRow = null;
    let headerIndex = -1;
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!Array.isArray(row)) continue;
        const hasContent = row.some(cell => String(cell || '').trim() !== '');
        if (hasContent) {
            headerRow = row.map(cell => {
                const value = String(cell || '').trim();
                const key = value.toLowerCase().replace(/\s+/g, '');
                const fieldMappings = {
                    'qualificationprogramtitle': 'Qualification',
                    'sex': 'Gender',
                    'municipalitycity': 'Municipality',
                    'province': 'Province',
                    'datestarted': 'Date_Started',
                    'date_started': 'Date_Started',
                    'datefinished': 'Date_Finished',
                    'date_finished': 'Date_Finished'
                };
                return fieldMappings[key] || value || 'Column';
            });
            headerIndex = i;
            break;
        }
    }

    if (!headerRow) {
        statusMessage.textContent = "Empty file - no data found";
        uploadButton.disabled = true;
        return;
    }

    const headerTr = document.createElement("tr");
    headerRow.forEach(header => {
        const th = document.createElement("th");
        th.textContent = header;
        headerTr.appendChild(th);
    });
    thead.appendChild(headerTr);

    let rowCount = 0;
    for (let i = headerIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!Array.isArray(row)) continue;
        if (isStopRow(row)) {
            console.log(`Stopped rendering/reading at row ${i}: stop marker found`);
            break;
        }
        const rowHasData = row.some(cell => String(cell || '').trim() !== '');
        if (!rowHasData) continue;

        const tr = document.createElement("tr");
        for (let j = 0; j < headerRow.length; j++) {
            const td = document.createElement("td");
            td.textContent = row[j] !== undefined ? row[j] : '';
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
        rowCount++;
    }

    document.getElementById("rowCount").textContent = rowCount;
    document.getElementById("columnCount").textContent = headerRow.length;
    uploadButton.disabled = rowCount === 0;
}