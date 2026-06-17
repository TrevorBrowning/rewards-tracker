// employees.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


let employees = [];
let reports = [];
let userHasManagementPrivileges = false;

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }


    const email = user.email || "";
    userHasManagementPrivileges = (email === "trevryanbrowning@gmail.com" || email.startsWith("manager@store"));

    document.body.style.display = "block";

    // Reveal administrative onboarding fields if the role matches clearance benchmarks
    const onboardPanel = document.getElementById("adminOnboardPanel");
    if (onboardPanel && userHasManagementPrivileges) {
        onboardPanel.style.display = "block";
    }

    initializeCloudSync();
});

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("addEmployeeForm")?.addEventListener("submit", handleAddEmployee);
    
    document.getElementById("logoutBtn")?.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "index.html";
        } catch (error) {
            console.error("Logout request dropped:", error);
        }
    });
});


function initializeCloudSync() {
    // 1. Sync Reports Registry (Needed to keep shift-tallies accurate down below)
    onSnapshot(collection(db, "reports"), (snapshot) => {
        reports = [];
        snapshot.forEach((doc) => {
            reports.push(doc.data());
        });
        renderRosterDirectory();
    }, (error) => {
        console.error("Reports channel broken:", error);
    });

    // 2. Sync Roster Directory Registry
    onSnapshot(collection(db, "employees"), (snapshot) => {
        employees = [];
        snapshot.forEach((docSnap) => {
            employees.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
        renderRosterDirectory();
    }, (error) => {
        console.error("Employee roster channel broken:", error);
    });
}


function renderRosterDirectory() {
    const tbody = document.getElementById("employeeRosterTable");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!employees.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: #64748b; padding: 32px;">
                    No active personnel profiles have been registered in the database yet.
                </td>
            </tr>
        `;
        return;
    }


    const sortedRoster = [...employees].sort((a, b) => {
        const nameA = String(a?.name || "");
        const nameB = String(b?.name || "");
        return nameA.localeCompare(nameB);
    });

    sortedRoster.forEach((emp) => {
        const empName = emp.name || "Unknown Employee";
        
        // Calculate historical career parameters dynamically by matching global shift reports safely
        const totalShifts = reports.filter(r => r.employee === empName).length;
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${empName}</strong></td>
            <td><span class="badge">${totalShifts} shift logs</span></td>
            <td style="text-align: right;">
                <button class="btn-danger btn-sm fire-employee-btn" data-id="${emp.id}" ${!userHasManagementPrivileges ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                    Remove Personnel
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Bind event receivers directly over cloud removal target buttons
    document.querySelectorAll(".fire-employee-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const targetId = e.currentTarget.getAttribute("data-id");
            removeEmployeeFromRoster(targetId);
        });
    });
}


async function handleAddEmployee(event) {
    event.preventDefault();

    if (!userHasManagementPrivileges) {
        alert("Action Denied: Standard accounts do not have permission to modify rosters.");
        return;
    }

    const nameInput = document.getElementById("newEmployeeName");
    if (!nameInput) return;

    const formattedName = nameInput.value.trim();

    if (!formattedName) {
        alert("Validation Fail: Please enter a recognizable name string.");
        return;
    }


    const nameExists = employees.some(emp => {
        const currentName = emp?.name ? String(emp.name).toLowerCase() : "";
        return currentName === formattedName.toLowerCase();
    });

    if (nameExists) {
        alert(`Roster Conflict: An employee named "${formattedName}" is already registered.`);
        return;
    }

    try {
        await addDoc(collection(db, "employees"), {
            name: formattedName
        });
        
        nameInput.value = "";
        nameInput.focus();
    } catch (error) {
        console.error("Firestore employee creation error:", error);
        alert("Server Rejection: Unable to add employee. Verify your database configurations.");
    }
}

async function removeEmployeeFromRoster(docId) {
    if (!userHasManagementPrivileges) return;

    if (!confirm("Are you completely certain you want to remove this employee from the active roster directory database?")) {
        return;
    }

    try {
        await deleteDoc(doc(db, "employees", docId));
    } catch (error) {
        console.error("Firestore employee removal error:", error);
        alert("Access Denied: Server rejected your file modification payload request.");
    }
}