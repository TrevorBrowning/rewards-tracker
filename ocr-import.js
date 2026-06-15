


if (localStorage.getItem("loggedIn") !== "true") {
    window.location.href = "index.html";
}




let parsed =
    JSON.parse(localStorage.getItem("ocrParsed")) || [];




const today =
    new Date().toISOString().split("T")[0];

document.getElementById("importDate").value = today;




function render() {

    const tbody =
        document.getElementById("reviewTable");

    tbody.innerHTML = "";

    parsed.forEach((row, index) => {

        const tr =
            document.createElement("tr");

        tr.innerHTML = `
            <td>${row.name}</td>

            <td>
                <input type="number"
                    value="${row.transactions}"
                    onchange="update(${index}, 'transactions', this.value)">
            </td>

            <td>
                <input type="number"
                    value="${row.rewards}"
                    onchange="update(${index}, 'rewards', this.value)">
            </td>

            <td>
                ${(row.percent || 0).toFixed(1)}%
            </td>
        `;

        tbody.appendChild(tr);

    });

}




function update(index, field, value) {

    parsed[index][field] =
        parseInt(value);

}




document.getElementById("saveImportBtn")
.addEventListener("click", () => {

    const date =
        document.getElementById("importDate").value;

    let reports =
        JSON.parse(localStorage.getItem("reports")) || [];

    parsed.forEach(r => {

        reports.push({
            date,
            employee: r.name,
            transactions: r.transactions,
            rewards: r.rewards
        });

    });

    localStorage.setItem(
        "reports",
        JSON.stringify(reports)
    );

    alert("Import saved successfully!");

    window.location.href = "reports.html";

});




render();