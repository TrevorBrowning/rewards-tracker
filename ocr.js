const imageInput =
document.getElementById("imageInput");

const scanBtn =
document.getElementById("scanBtn");

const saveBtn =
document.getElementById("saveBtn");

const resultsBody =
document.getElementById("resultsBody");

const reportDate =
document.getElementById("reportDate");

let importedRows = [];

scanBtn.addEventListener("click", async () => {

    const file =
    imageInput.files[0];

    if (!file) {
        alert("Select an image first.");
        return;
    }

    scanBtn.disabled = true;
    scanBtn.textContent = "Scanning...";

    const result =
    await Tesseract.recognize(
        file,
        "eng"
    );

    const text =
    result.data.text;

    console.log(text);

    parseReport(text);

    scanBtn.disabled = false;
    scanBtn.textContent = "Scan Report";

});

function parseReport(text) {

    importedRows = [];

    resultsBody.innerHTML = "";

    // --------------------
    // DATE
    // --------------------

    const dateMatch =
    text.match(
        /(\d{1,2}\/\d{1,2}\/\d{4})/
    );

    if (dateMatch) {

        const parts =
        dateMatch[1].split("/");

        reportDate.value =
        `${parts[2]}-${parts[0].padStart(2,"0")}-${parts[1].padStart(2,"0")}`;

    }

    // --------------------
    // EMPLOYEE ROWS
    // --------------------

    const lines =
    text.split("\n");

    lines.forEach(line => {

        const cleaned =
        line.trim();

        if (!cleaned) return;

        if (
            cleaned.includes("Total") ||
            cleaned.includes("Cashier") ||
            cleaned.includes("Oracle") ||
            cleaned.includes("Rewards") ||
            cleaned.includes("Transaction") ||
            cleaned.includes("Display")
        ) {
            return;
        }

        const match =
        cleaned.match(
            /^([A-Za-z\s]+?)\s+(\d+)\s+(\d+)/
        );

        if (!match) return;

        const employee =
        match[1].trim();

        const transactions =
        parseInt(match[2]);

        const rewards =
        parseInt(match[3]);

        if (
            employee.length < 3 ||
            employee === "Total"
        ) {
            return;
        }

        const percent =
        transactions === 0
            ? 0
            : (
                rewards /
                transactions *
                100
            ).toFixed(1);

        importedRows.push({
            employee,
            transactions,
            rewards,
            percent
        });

    });

    renderResults();

}

function renderResults() {

    resultsBody.innerHTML = "";

    importedRows.forEach(row => {

        const tr =
        document.createElement("tr");

        tr.innerHTML = `
            <td>${row.employee}</td>
            <td>${row.transactions}</td>
            <td>${row.rewards}</td>
            <td>${row.percent}%</td>
        `;

        resultsBody.appendChild(tr);

    });

}

saveBtn.addEventListener("click", () => {

    const reports =
    JSON.parse(
        localStorage.getItem("reports")
    ) || [];

    importedRows.forEach(row => {

        reports.push({

            employee:
            row.employee,

            transactions:
            row.transactions,

            rewards:
            row.rewards,

            date:
            reportDate.value

        });

    });

    localStorage.setItem(
        "reports",
        JSON.stringify(reports)
    );

    alert(
        `${importedRows.length} reports imported successfully`
    );

    window.location.href =
    "dashboard.html";

});