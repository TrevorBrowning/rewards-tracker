
if (localStorage.getItem("loggedIn") !== "true") {
    window.location.href = "index.html";
}


let employees =
    JSON.parse(localStorage.getItem("employees")) || [];


function normalize(name) {
    return name.trim().toLowerCase();
}


function saveEmployees() {
    localStorage.setItem(
        "employees",
        JSON.stringify(employees)
    );
}


function cleanEmployees() {

    const seen = new Set();

    employees = employees
        .map(e => e.trim())
        .filter(e => {

            const key = normalize(e);

            if (seen.has(key)) return false;

            seen.add(key);
            return true;

        });

    saveEmployees();

}


function renderEmployees() {

    const tbody =
        document.getElementById("employeeTable");

    tbody.innerHTML = "";

    employees.forEach((emp, index) => {

        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td>${emp}</td>
            <td>
                <button onclick="deleteEmployee(${index})"
                    class="delete-btn">
                    Delete
                </button>
            </td>
        `;

        tbody.appendChild(row);

    });

}


document.getElementById("addEmployeeBtn")
.addEventListener("click", () => {

    const input =
        document.getElementById("employeeName");

    const name =
        input.value.trim();

    if (!name) {
        alert("Enter a valid name");
        return;
    }

    
    const exists = employees.some(emp =>
        normalize(emp) === normalize(name)
    );

    if (exists) {
        alert("Employee already exists");
        return;
    }

    employees.push(name);

    saveEmployees();
    renderEmployees();

    input.value = "";

});


function deleteEmployee(index) {

    if (!confirm("Delete employee?")) return;

    employees.splice(index, 1);

    saveEmployees();
    renderEmployees();

}


document.getElementById("logoutBtn")
.addEventListener("click", () => {

    localStorage.removeItem("loggedIn");

    window.location.href = "index.html";

});


cleanEmployees();
renderEmployees();