


if (localStorage.getItem("loggedIn") !== "true") {
    window.location.href = "index.html";
}




let reports =
    JSON.parse(localStorage.getItem("reports")) || [];

let employees =
    JSON.parse(localStorage.getItem("employees")) || [];




function saveReports() {
    localStorage.setItem("reports", JSON.stringify(reports));
}




function loadEmployeesIntoDropdown() {

    employees =
        JSON.parse(localStorage.getItem("employees")) || [];

    const select =
        document.getElementById("employeeSelect");

    select.innerHTML =
        `<option value="">Select Employee</option>`;

    employees.forEach(emp => {

        const option =
            document.createElement("option");

        option.value = emp;
        option.textContent = emp;

        select.appendChild(option);

    });

}




function percent(r) {
    return r.transactions === 0
        ? 0
        : (r.rewards / r.transactions) * 100;
}




function renderReports() {

    const tbody =
        document.getElementById("reportTable");

    tbody.innerHTML = "";

    reports
        .slice()
        .reverse()
        .forEach((r, index) => {

            const p = percent(r);

            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td>${r.date}</td>
                <td>${r.employee}</td>
                <td>${r.transactions}</td>
                <td>${r.rewards}</td>
                <td>${p.toFixed(1)}%</td>
                <td>
                    <button class="delete-btn"
                        onclick="deleteReport(${index})">
                        Delete
                    </button>
                </td>
            `;

            tbody.appendChild(row);

        });

}




document.getElementById("addReportBtn")
.addEventListener("click", () => {

    const date =
        document.getElementById("reportDate").value;

    const employee =
        document.getElementById("employeeSelect").value;

    const transactions =
        parseInt(document.getElementById("transactions").value);

    const rewards =
        parseInt(document.getElementById("rewards").value);

    if (!date || !employee) {
        alert("Please fill date and select employee");
        return;
    }

    if (isNaN(transactions) || isNaN(rewards)) {
        alert("Enter valid numbers");
        return;
    }

    reports.push({
        date,
        employee,
        transactions,
        rewards
    });

    saveReports();
    renderReports();

    
    document.getElementById("transactions").value = "";
    document.getElementById("rewards").value = "";

});




function deleteReport(index) {

    if (!confirm("Delete this report?")) return;

    
    const realIndex =
        reports.length - 1 - index;

    reports.splice(realIndex, 1);

    saveReports();
    renderReports();

}




document.getElementById("logoutBtn")
.addEventListener("click", () => {

    localStorage.removeItem("loggedIn");

    window.location.href = "index.html";

});




loadEmployeesIntoDropdown();
renderReports();