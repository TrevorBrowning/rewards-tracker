


if (localStorage.getItem("loggedIn") !== "true") {
    window.location.href = "index.html";
}




let reports =
    JSON.parse(localStorage.getItem("reports")) || [];

const employees =
    JSON.parse(localStorage.getItem("employees")) || [];




const rangeSelect =
    document.getElementById("rangeSelect");

const goalInput =
    document.getElementById("goalInput");

let trendChart;
let employeeChart;




function getFilteredReports() {

    const range = rangeSelect?.value || "all";

    if (range === "all") return reports;

    const days = parseInt(range);

    if (isNaN(days)) return reports;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return reports.filter(r =>
        new Date(r.date) >= cutoff
    );

}




function percent(r) {
    return r.transactions === 0
        ? 0
        : (r.rewards / r.transactions) * 100;
}




function buildDashboard() {

    const data = getFilteredReports();

    if (!data.length) return;

    let totalT = 0;
    let totalR = 0;

    const dailyMap = {};
    const empStats = {};

    data.forEach(r => {

        totalT += Number(r.transactions) || 0;
        totalR += Number(r.rewards) || 0;

        
        if (!dailyMap[r.date]) {
            dailyMap[r.date] = [];
        }

        dailyMap[r.date].push(percent(r));

        
        if (!empStats[r.employee]) {
            empStats[r.employee] = { t: 0, r: 0 };
        }

        empStats[r.employee].t += Number(r.transactions) || 0;
        empStats[r.employee].r += Number(r.rewards) || 0;

    });

    
    
    
    const storeAvg =
        totalT === 0
            ? 0
            : (totalR / totalT) * 100;

    const storeAvgEl =
        document.getElementById("storeAverage");

    if (storeAvgEl)
        storeAvgEl.textContent =
            storeAvg.toFixed(1) + "%";

    
    
    
    let top = "N/A";
    let topVal = 0;

    Object.keys(empStats).forEach(name => {

        const s = empStats[name];
        const p = s.t === 0 ? 0 : (s.r / s.t) * 100;

        if (p > topVal) {
            topVal = p;
            top = `${name} (${p.toFixed(1)}%)`;
        }

    });

    const topEl =
        document.getElementById("topPerformer");

    if (topEl)
        topEl.textContent = top;

    
    
    
    const sortedDates =
        Object.keys(dailyMap)
            .sort((a, b) =>
                new Date(a) - new Date(b)
            );

    const trendData =
        sortedDates.map(date => {

            const arr = dailyMap[date];

            return (
                arr.reduce((a, b) => a + b, 0) /
                arr.length
            ).toFixed(1);

        });

    const goal =
        parseFloat(goalInput?.value || 75);

    const goalLine =
        sortedDates.map(() => goal);

    if (trendChart) trendChart.destroy();

    const trendCanvas =
        document.getElementById("trendChart");

    if (trendCanvas) {

        trendChart = new Chart(trendCanvas, {
            type: "line",
            data: {
                labels: sortedDates,
                datasets: [
                    {
                        label: "Store %",
                        data: trendData,
                        borderWidth: 2
                    },
                    {
                        label: "Goal",
                        data: goalLine,
                        borderWidth: 2,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true
            }
        });

    }

    
    
    
    const empLabels = [];
    const empData = [];

    Object.keys(empStats).forEach(name => {

        const s = empStats[name];

        empLabels.push(name);
        empData.push(
            ((s.r / s.t) * 100 || 0).toFixed(1)
        );

    });

    if (employeeChart) employeeChart.destroy();

    const empCanvas =
        document.getElementById("employeeChart");

    if (empCanvas) {

        employeeChart = new Chart(empCanvas, {
            type: "bar",
            data: {
                labels: empLabels,
                datasets: [{
                    label: "Employee %",
                    data: empData
                }]
            },
            options: {
                responsive: true
            }
        });

    }

}




document.getElementById("applyFilters")
?.addEventListener("click", buildDashboard);


document.getElementById("logoutBtn")
?.addEventListener("click", () => {

    localStorage.removeItem("loggedIn");
    window.location.href = "index.html";

});


document.getElementById("openOCR")
?.addEventListener("click", () => {

    window.location.href = "ocr.html";

});




document.getElementById("printReport")
?.addEventListener("click", () => {

    const reports =
        JSON.parse(localStorage.getItem("reports")) || [];

    if (!reports.length) {
        alert("No reports found");
        return;
    }

    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);

    const filtered = reports.filter(r => {
        const d = new Date(r.date);
        return d >= weekAgo && !isNaN(d);
    });

    if (!filtered.length) {
        alert("No data for selected week");
        return;
    }

    
    const map = {};

    filtered.forEach(r => {

        const p =
            r.transactions === 0
                ? 0
                : (r.rewards / r.transactions) * 100;

        if (!map[r.employee]) {
            map[r.employee] = {
                name: r.employee,
                transactions: 0,
                rewards: 0,
                total: 0,
                count: 0
            };
        }

        map[r.employee].transactions += Number(r.transactions) || 0;
        map[r.employee].rewards += Number(r.rewards) || 0;
        map[r.employee].total += p;
        map[r.employee].count++;

    });

    const list =
        Object.values(map)
            .map(e => ({
                ...e,
                avg: e.count ? e.total / e.count : 0
            }))
            .sort((a, b) => b.avg - a.avg);

    
    const tbody =
        document.getElementById("printTable");

    if (!tbody) return;

    tbody.innerHTML = "";

    list.forEach((emp, i) => {

        const row =
            document.createElement("tr");

        if (i === 0) row.classList.add("top-row");

        row.innerHTML = `
            <td>${i + 1}</td>
            <td>${emp.name}</td>
            <td>${emp.transactions}</td>
            <td>${emp.rewards}</td>
            <td>${emp.avg.toFixed(1)}%</td>
        `;

        tbody.appendChild(row);

    });

    
    const storeAvg =
        list.length
            ? list.reduce((a, b) => a + b.avg, 0) / list.length
            : 0;

    document.getElementById("printStoreAvg")
        .textContent = storeAvg.toFixed(1) + "%";

    document.getElementById("printTotalReports")
        .textContent = filtered.length;

    document.getElementById("printTopPerformer")
        .textContent = list[0]?.name || "N/A";

    document.getElementById("printDateRange")
        .textContent =
        `Weekly Competition (${weekAgo.toLocaleDateString()} - ${now.toLocaleDateString()})`;

    
    requestAnimationFrame(() => {
        window.print();
    });

});




buildDashboard();




function downloadCSV(data) {

    let csv =
        "Date,Employee,Transactions,Rewards,Percent\n";

    data.forEach(r => {

        const p =
            r.transactions === 0
                ? 0
                : ((r.rewards / r.transactions) * 100).toFixed(1);

        csv +=
            `${r.date},${r.employee},${r.transactions},${r.rewards},${p}\n`;

    });

    const blob =
        new Blob([csv], { type: "text/csv" });

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;
    a.download = "rewards-report.csv";

    a.click();

    URL.revokeObjectURL(url);
}

document.getElementById("exportCSV")
?.addEventListener("click", () => {

    const data =
        getFilteredReports();

    downloadCSV(data);

});