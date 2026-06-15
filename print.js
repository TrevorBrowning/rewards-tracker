const reports =
    JSON.parse(localStorage.getItem("reports")) || [];

function percent(r) {
    return r.transactions === 0
        ? 0
        : (r.rewards / r.transactions) * 100;
}




function parseDate(str) {
    
    return new Date(str + "T00:00:00");
}




function getLast7Days() {

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    return reports.filter(r =>
        parseDate(r.date) >= cutoff
    );
}


let weekly = getLast7Days();

if (weekly.length === 0) {
    weekly = reports;
}




if (weekly.length > 0) {

    const dates =
        weekly.map(r => parseDate(r.date));

    const min =
        new Date(Math.min(...dates));

    const max =
        new Date(Math.max(...dates));

    document.getElementById("weekRange").textContent =
        `${min.toDateString()} → ${max.toDateString()}`;
}




const tbody =
    document.getElementById("reportBody");

tbody.innerHTML = "";

weekly
    .slice()
    .reverse()
    .forEach(r => {

        const p = percent(r);

        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td>${r.date}</td>
            <td>${r.employee}</td>
            <td>${r.transactions}</td>
            <td>${r.rewards}</td>
            <td class="${p >= 75 ? "good" : "bad"}">
                ${p.toFixed(1)}%
            </td>
        `;

        tbody.appendChild(row);

    });




let totalT = 0;
let totalR = 0;

const empStats = {};
let best = 0;

weekly.forEach(r => {

    totalT += r.transactions;
    totalR += r.rewards;

    const p = percent(r);

    if (p > best) best = p;

    if (!empStats[r.employee]) {
        empStats[r.employee] = { t: 0, r: 0 };
    }

    empStats[r.employee].t += r.transactions;
    empStats[r.employee].r += r.rewards;

});


const storeAvg =
    totalT === 0 ? 0 : (totalR / totalT) * 100;

document.getElementById("storeAvg")
    .textContent = storeAvg.toFixed(1) + "%";

document.getElementById("totalReports")
    .textContent = weekly.length;


let top = "N/A";
let topVal = 0;

Object.keys(empStats).forEach(name => {

    const s = empStats[name];
    const p = (s.r / s.t) * 100;

    if (p > topVal) {
        topVal = p;
        top = `${name} (${p.toFixed(1)}%)`;
    }

});

document.getElementById("topPerformer")
    .textContent = top;

document.getElementById("bestDay")
    .textContent = best.toFixed(1) + "%";