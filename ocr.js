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

    const file = imageInput.files[0];

    if (!file) {
        alert("Select an image first.");
        return;
    }

    scanBtn.disabled = true;
    scanBtn.textContent = "Scanning...";

    const img = new Image();

    img.onload = async () => {

        try {

            const canvas =
                document.createElement("canvas");

            const ctx =
                canvas.getContext("2d");

            canvas.width = img.height;
            canvas.height = img.width;

            ctx.translate(
                canvas.width / 2,
                canvas.height / 2
            );

            ctx.rotate(Math.PI / 2);

            ctx.drawImage(
                img,
                -img.width / 2,
                -img.height / 2
            );
            
            const imageData =
    ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    );

const data =
    imageData.data;

for (let i = 0; i < data.length; i += 4) {

    const avg =
        (
            data[i] +
            data[i + 1] +
            data[i + 2]
        ) / 3;

    const value =
        avg > 180 ? 255 : 0;

    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
}

ctx.putImageData(
    imageData,
    0,
    0
);

            const result =
                await Tesseract.recognize(
                    canvas,
                    "eng"
                );

            const text =
                result.data.text;

            console.log("OCR RESULT:");
            console.log(text);

            parseReport(text);

        } catch (err) {

            console.error(err);

            alert(
                "OCR failed. Check console."
            );

        }

        scanBtn.disabled = false;
        scanBtn.textContent = "Scan Report";

    };

    img.src =
        URL.createObjectURL(file);

});

function parseReport(text) {

    importedRows = [];

    resultsBody.innerHTML = "";

    let debug =
        document.getElementById("ocrDebug");

    if (!debug) {

        debug =
            document.createElement("textarea");

        debug.id = "ocrDebug";

        debug.style.width = "100%";
        debug.style.height = "250px";
        debug.style.marginTop = "20px";

        document.body.appendChild(debug);

    }

    debug.value = text;

    const dateMatches =
        text.match(/\d{1,2}\/\d{1,2}\/\d{4}/g);

    if (dateMatches && dateMatches.length) {

        const parts =
            dateMatches[0].split("/");

        reportDate.value =
            `${parts[2]}-${parts[0].padStart(2,"0")}-${parts[1].padStart(2,"0")}`;

    }

    const lines =
        text
        .split("\n")
        .map(x => x.trim())
        .filter(x => x.length);

    lines.forEach(line => {

        const match =
            line.match(
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
            employee.toLowerCase().includes("total")
        ) {
            return;
        }

        importedRows.push({
            employee,
            transactions,
            rewards,
            percent:
                transactions === 0
                ? 0
                : (
                    rewards /
                    transactions *
                    100
                  ).toFixed(1)
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

    if (!importedRows.length) {

        alert(
            "No employee data detected."
        );

        return;

    }

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
        `${importedRows.length} reports imported`
    );

    window.location.href =
        "dashboard.html";

});