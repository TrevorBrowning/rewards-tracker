// reports.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    deleteDoc, 
    getDocs, 
    writeBatch 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


let reports = [];
let employees = [];
let isUserWebAdmin = false;

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }


    isUserWebAdmin = (user.email === "trevryanbrowning@gmail.com");


    document.body.style.display = "block";


    initializeDatabaseListeners();
});


document.addEventListener("DOMContentLoaded", () => {
    // Populate the date input field with today's calendar date default
    const dateInput = document.getElementById("reportDate");
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    document.getElementById("reportForm")?.addEventListener("submit", handleAddReport);
    
    document.getElementById("logoutBtn")?.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "index.html";
        } catch (error) {
            console.error("Logout runtime error encountered:", error);
        }
    });
});


function initializeDatabaseListeners() {
    // 1. Synchronize Live Employee Dropdown Registry
    onSnapshot(collection(db, "employees"), (snapshot) => {
        employees = [];
        snapshot.forEach((doc) => {
            employees.push(doc.data());
        });
        loadEmployeesIntoDropdown();
    }, (error) => {
        console.error("Employee synchronizer connection lost:", error);
    });

    // 2. Synchronize Live Shift Activity Reports Registry
    onSnapshot(collection(db, "reports"), (snapshot) => {
        reports = [];
        snapshot.forEach((docSnap) => {
            reports.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
        
        renderReports();
        renderAdminControls(); // Refresh access layout tools if account state alters
    }, (error) => {
        console.error("Reports synchronizer connection lost:", error);
    });
}


function loadEmployeesIntoDropdown() {
    const select = document.getElementById("employeeSelect");
    if (!select) return;

    select.innerHTML = `<option value="">Select Employee...</option>`;

    const sortedEmployees = [...employees].sort((a, b) => {
        const nameA = typeof a === 'string' ? a : a.name || '';
        const nameB = typeof b === 'string' ? b : b.name || '';
        return nameA.localeCompare(nameB);
    });

    sortedEmployees.forEach(emp => {
        const nameString = typeof emp === 'string' ? emp : emp.name;
        if (!nameString) return;

        const option = document.createElement("option");
        option.value = nameString;
        option.textContent = nameString;
        select.appendChild(option);
    });
}


function calculatePercent(r) {
    const t = Number(r.transactions) || 0;
    const rewards = Number(r.rewards) || 0;
    return t === 0 ? 0 : (rewards / t) * 100;
}

function renderReports() {
    const tbody = document.getElementById("reportTable");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!reports.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #64748b; padding: 32px;">
                    No daily performance reports have been logged in the storage database yet.
                </td>
            </tr>
        `;
        return;
    }


    const presentedLogs = [...reports].sort((a, b) => new Date(b.date) - new Date(a.date));

    presentedLogs.forEach((r) => {
        const p = calculatePercent(r);
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${r.date}</td>
            <td><strong>${r.employee}</strong></td>
            <td>${r.transactions}</td>
            <td>${r.rewards}</td>
            <td><strong>${p.toFixed(1)}%</strong></td>
            <td style="text-align: right;">
                <button class="btn-danger btn-sm delete-report-btn" data-id="${r.id}">
                    Delete
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });

  
    document.querySelectorAll(".delete-report-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const targetDocId = e.currentTarget.getAttribute("data-id");
            deleteSingleReport(targetDocId);
        });
    });
}


function renderAdminControls() {
    const container = document.getElementById("adminControlsContainer");
    if (!container) return;

    if (isUserWebAdmin && reports.length > 0) {
        container.innerHTML = `
            <button id="purgeAllReportsBtn" class="btn-danger" style="padding: 6px 14px; font-size: 13px; font-weight: 600;">
                ☢️ Emergency Purge All Logs
            </button>
        `;
        document.getElementById("purgeAllReportsBtn")?.addEventListener("click", executePurgeAllReports);
    } else {
        container.innerHTML = "";
    }
}


async function handleAddReport(event) {
    event.preventDefault();

    const date = document.getElementById("reportDate").value;
    const employee = document.getElementById("employeeSelect").value;
    const transactionsInput = document.getElementById("transactions");
    const rewardsInput = document.getElementById("rewards");

    const transactions = parseInt(transactionsInput.value, 10);
    const rewards = parseInt(rewardsInput.value, 10);

    if (!date || !employee) {
        alert("Input Incomplete: Please assign a targeted entry calendar date and select an active employee.");
        return;
    }

    if (isNaN(transactions) || isNaN(rewards) || transactions < 0 || rewards < 0) {
        alert("Data Validation Error: Customer transactional fields require positive numerical values.");
        return;
    }

    if (rewards > transactions) {
        alert(`Mathematical Discrepancy: Active rewards usage matches (${rewards}) cannot outnumber total tracked transactions (${transactions}).`);
        rewardsInput.focus();
        return;
    }

    try {
        const submitBtn = document.getElementById("addReportBtn");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Uploading...";
        }

        await addDoc(collection(db, "reports"), {
            date,
            employee,
            transactions,
            rewards
        });

       
        transactionsInput.value = "";
        rewardsInput.value = "";
        transactionsInput.focus();

    } catch (error) {
        console.error("Firestore insertion transaction dropped:", error);
        alert("Permission Denied: System rejects data insertion block. Verification required.");
    } finally {
        const submitBtn = document.getElementById("addReportBtn");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Report";
        }
    }
}


async function deleteSingleReport(docId) {
    if (!confirm("Are you completely certain you want to purge this daily report record line out of the dashboard system?")) {
        return;
    }

    try {
        
        await deleteDoc(doc(db, "reports", docId));
    } catch (error) {
        console.error("Firestore removal transaction dropped:", error);
        alert("Access Denied: Your account role does not feature administrative delete rights over global archives.");
    }
}


async function executePurgeAllReports() {
    if (!isUserWebAdmin) return;

    const safetyCheckA = confirm("⚠️ CRITICAL OVERRIDE ACTIVATED ⚠️\nYou are preparing to delete EVERY report log across the entire store directory database. This cannot be undone. Proceed?");
    if (!safetyCheckA) return;

    const safetyCheckB = confirm("Double verification: Are you 100% sure you want to permanently clear the entire analytics board database history right now?");
    if (!safetyCheckB) return;

    try {
        const reportsRef = collection(db, "reports");
        const snapshot = await getDocs(reportsRef);
        
        const batch = writeBatch(db);
        snapshot.forEach((docSnapshot) => {
            batch.delete(docSnapshot.ref);
        });
        
        await batch.commit();
        alert("Database Purge Successful: All historical logs wiped.");
    } catch (error) {
        console.error("Batch purge operations failed:", error);
        alert("Purge Failure: Server rejected mass removal operation.");
    }
}