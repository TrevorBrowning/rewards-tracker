const STORE_PASSWORD = "test123";

const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", function(e) {

    e.preventDefault();

    const password =
        document.getElementById("password").value;

    if(password === STORE_PASSWORD){

        localStorage.setItem("loggedIn", "true");

        window.location.href = "dashboard.html";

    } else {

        alert("Incorrect Password");

    }

});