


if (localStorage.getItem("loggedIn") !== "true") {
    window.location.href = "index.html";
}




const reports =
    JSON.parse(localStorage.getItem("reports")) || [];

const employees =
    JSON.parse(localStorage.getItem("employees")) || [];




const select =
    document.getElementById("employeeSelect");

let chart;




function loadEmployees() {

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




function renderEmployee(name) {

    const data =
        reports.filter(r => r.employee === name);

    document.getElementById("employeeNameTitle")
        .textContent = name;

    if (data.length === 0) {
        clearUI();
        return;
    }

    
    let totalT = 0;
    let totalR = 0;

    let best = 0;
    let worst = 100;

    const labels = [];
    const values = [];

    const tbody =
        document.getElementById("reportTable");

    tbody.innerHTML = "";

    data.forEach(r => {

        const p = percent(r);

        totalT += r.transactions;
        totalR += r.rewards;

        if (p > best) best = p;
        if (p < worst) worst = p;

        labels.push(r.date);
        values.push(p.toFixed(1));

        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td>${r.date}</td>
            <td>${r.transactions}</td>
            <td>${r.rewards}</td>
            <td>${p.toFixed(1)}%</td>
        `;

        tbody.appendChild(row);

    });

    const avg =
        totalT === 0 ? 0 : (totalR / totalT) * 100;

    document.getElementById("avgPercent")
        .textContent = avg.toFixed(1) + "%";

    document.getElementById("totalReports")
        .textContent = data.length;

    document.getElementById("bestDay")
        .textContent = best.toFixed(1) + "%";

    document.getElementById("worstDay")
        .textContent = worst.toFixed(1) + "%";

    
    if (chart) chart.destroy();

    chart = new Chart(
        document.getElementById("trendChart"),
        {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: "Performance %",
                    data: values,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true
            }
        }
    );

}




function clearUI() {

    document.getElementById("avgPercent")
        .textContent = "0%";

    document.getElementById("totalReports")
        .textContent = "0";

    document.getElementById("bestDay")
        .textContent = "0%";

    document.getElementById("worstDay")
        .textContent = "0%";

    document.getElementById("reportTable")
        .innerHTML = "";

    if (chart) chart.destroy();

}




select.addEventListener("change", () => {

    renderEmployee(select.value);

});




document.getElementById("logoutBtn")
.addEventListener("click", () => {

    localStorage.removeItem("loggedIn");

    window.location.href = "index.html";

});




loadEmployees();