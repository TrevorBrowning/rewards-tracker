// script.js
import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");

    loginForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const keyInput = document.getElementById("accessKey");
        if (!keyInput) return;

        const rawKey = keyInput.value.trim();
        
        let targetEmail = "";
        let firebasePassword = "";

      
        if (/^\d{4}$/.test(rawKey)) {
            targetEmail = `associate@store${rawKey}.com`;
            firebasePassword = `store${rawKey}`; // Changes '0592' into 'store0592' (6+ chars!)
        } 
  
        else if (/^GM\d{4}$/i.test(rawKey)) {
            const storeNumber = rawKey.substring(2);
            targetEmail = `manager@store${storeNumber}.com`;
            firebasePassword = rawKey; // Matches exactly what they type (e.g., password: GM0592)
        } 

        else {
            targetEmail = "trevryanbrowning@gmail.com"; 
            firebasePassword = rawKey; // Whatever password you set for your Gmail account
        }

        try {
            const submitBtn = loginForm.querySelector("button[type='submit']");
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Authorizing System Access...";
            }

            await signInWithEmailAndPassword(auth, targetEmail, firebasePassword);
            
    
            window.location.href = "dashboard.html";

        } catch (error) {
            console.error("Firebase Login Error Code:", error.code);
            alert("Invalid Key: Access Denied.");
            
            const submitBtn = loginForm.querySelector("button[type='submit']");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Verify & Open Dashboard";
            }
            
            keyInput.value = "";
            keyInput.focus();
        }
    });
});