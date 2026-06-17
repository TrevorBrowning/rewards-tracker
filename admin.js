import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "index.html"; return; }
    
    // Check for "admin" claim
    const idTokenResult = await user.getIdTokenResult();
    if (idTokenResult.claims.admin) {
        document.getElementById("content").style.display = "block";
    } else {
        alert("Unauthorized.");
        window.location.href = "dashboard.html";
    }
});

document.getElementById("wipeDatabaseBtn").addEventListener("click", async () => {
    if (!confirm("Wipe all data?")) return;
    const snap = await getDocs(collection(db, "reports"));
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, "reports", d.id))));
    alert("Wiped.");
});