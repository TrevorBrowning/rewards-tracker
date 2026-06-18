import { auth, db, GLOBAL_STORE_GOAL } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let reports = [];
let trendChart = null;
let employeeChart = null;



onAuthStateChanged(auth, (user) => {
    if (!user) {
        localStorage.removeItem("dashboardGoal");
        window.location.href = "index.html";
    } else {
        localStorage.setItem("dashboardGoal", GLOBAL_STORE_GOAL);
        document.body.style.display = "block";
        initializeDatabaseListener();
    }
});

document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("applyFilters")?.addEventListener("click", buildDashboard);

    document.getElementById("logoutBtn")?.addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = "index.html";
    });

    document.getElementById("exportCSV")?.addEventListener("click", () => {
        downloadCSV(getFilteredReports());
    });

    document.getElementById("printReport")?.addEventListener("click", () => {
        window.open("print.html", "_blank");
    });
    document.getElementById("pdfReportBtn")?.addEventListener("click", () => {
        const dateValue = document.getElementById("weekPicker")?.value;

        const date = dateValue || new Date().toISOString().split('T')[0];
        window.open(`PDFReport.html?date=${date}`, "_blank");
    });
});



function initializeDatabaseListener() {
    onSnapshot(collection(db, "reports"), (snapshot) => {
        reports = snapshot.docs.map(d => d.data());
        buildDashboard();
    });
}



function parseDateSafe(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
}



function getWeekBounds(date) {
    const d = new Date(date);

    const sunday = new Date(d);
    sunday.setDate(d.getDate() - d.getDay());
    sunday.setHours(0, 0, 0, 0);

    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);

    return { start: sunday, end: saturday };
}

function getWeekReports(baseDate) {
    const { start, end } = getWeekBounds(baseDate);

    return reports.filter(r => {
        const d = parseDateSafe(r.date);
        return d && d >= start && d <= end;
    });
}



function getFilteredReports() {
    const val = document.getElementById("rangeSelect")?.value || "week";

    // CURRENT WEEK (DEFAULT)
    if (val === "week") {
        return getWeekReports(new Date());
    }

    if (val === "all") {
        return reports;
    }

    const days = parseInt(val, 10);
    if (isNaN(days)) {
        return getWeekReports(new Date());
    }

    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days);

    return reports.filter(r => {
        const d = parseDateSafe(r.date);
        return d && d >= cutoff;
    });
}


function buildDashboard() {

    const data = getFilteredReports();

    const storeAverageEl = document.getElementById("storeAverage");
    const avgChangeEl = document.getElementById("avgChange");
    const txnChangeEl = document.getElementById("txnChange");
    const topEl = document.getElementById("topPerformer");

    const currentWeek = getWeekReports(new Date());
    const lastWeek = getWeekReports(new Date(Date.now() - 7 * 86400000));

    const cur = computeWeek(currentWeek);
    const prev = computeWeek(lastWeek);


    const storeAvg = data.length
        ? (data.reduce((a, b) => a + (+b.rewards || 0), 0) /
           data.reduce((a, b) => a + (+b.transactions || 0), 0)) * 100
        : 0;

    if (storeAverageEl) {
        storeAverageEl.textContent = storeAvg.toFixed(1) + "%";
    }


    const diffAvg = cur.avg - prev.avg;
    const diffTxn = cur.transactions - prev.transactions;

    if (avgChangeEl) {
        avgChangeEl.textContent =
            `${cur.avg.toFixed(1)}% (${diffAvg >= 0 ? "+" : ""}${diffAvg.toFixed(1)}%)`;
    }

    if (txnChangeEl) {
        txnChangeEl.textContent =
            `${cur.transactions} txns (${diffTxn >= 0 ? "+" : ""}${diffTxn}) vs last week`;
    }

    /* TOP PERFORMER */
    const emp = buildEmployeeStats(data);

    let best = "N/A";
    let bestScore = -1;

    Object.entries(emp).forEach(([name, v]) => {
        const rate = v.t ? (v.r / v.t) * 100 : 0;
        if (rate > bestScore) {
            bestScore = rate;
            best = `${name} (${rate.toFixed(1)}%)`;
        }
    });

    if (topEl) topEl.textContent = best;

    /* WEEK SUMMARY */
    document.getElementById("weekTransactions").textContent = cur.transactions;
    document.getElementById("weekReportsSmall").textContent = currentWeek.length;

    /* CHARTS */
    renderTrendChart(data);
    renderEmployeeChart(emp);
    generateStoreInsights();
    updateGoalProgressBar(cur.avg);
}



function computeWeek(arr) {
    let t = 0;
    let r = 0;

    arr.forEach(x => {
        t += +x.transactions || 0;
        r += +x.rewards || 0;
    });

    return {
        transactions: t,
        rewards: r,
        avg: t ? (r / t) * 100 : 0
    };
}



function buildEmployeeStats(data) {
    const map = {};

    data.forEach(r => {
        if (!map[r.employee]) map[r.employee] = { t: 0, r: 0 };
        map[r.employee].t += +r.transactions || 0;
        map[r.employee].r += +r.rewards || 0;
    });

    return map;
}


function renderTrendChart(data) {

    const canvas = document.getElementById("trendChart");
    if (!canvas) return;

    const daily = {};

    data.forEach(r => {
        const d = parseDateSafe(r.date);
        if (!d) return;

        const key = d.toISOString().split("T")[0];

        if (!daily[key]) daily[key] = { t: 0, r: 0 };

        daily[key].t += +r.transactions || 0;
        daily[key].r += +r.rewards || 0;
    });

    const keys = Object.keys(daily).sort();

    const values = keys.map(k => {
        const x = daily[k];
        return x.t ? ((x.r / x.t) * 100).toFixed(1) : 0;
    });

    if (trendChart) trendChart.destroy();

    trendChart = new Chart(canvas, {
        type: "line",
        data: {
            labels: keys,
            datasets: [{
                label: "Performance %",
                data: values,
                borderColor: "#2563eb",
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function renderEmployeeChart(emp) {

    const canvas = document.getElementById("employeeChart");
    if (!canvas) return;

    const names = Object.keys(emp);
    const values = names.map(n =>
        emp[n].t ? ((emp[n].r / emp[n].t) * 100) : 0
    );

    if (employeeChart) employeeChart.destroy();

    employeeChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: names,
            datasets: [{
                data: values,
                backgroundColor: "#475569"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

/* ---------------- CSV EXPORT ---------------- */

function downloadCSV(data) {

    if (!data.length) return alert("No data");

    let csv = "Date,Employee,Transactions,Rewards,Rate\n";

    data.forEach(r => {
        const rate = r.transactions
            ? (r.rewards / r.transactions) * 100
            : 0;

        csv += `${r.date},${r.employee},${r.transactions},${r.rewards},${rate.toFixed(1)}%\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "report.csv";
    a.click();

    URL.revokeObjectURL(url);
}

function generateStoreInsights() {
    const currentTargetGoal = GLOBAL_STORE_GOAL || 0;
    const insightsContainer = document.getElementById("storeInsightsContainer");
    const weekLabel = document.getElementById("insightWeekLabel");
    if (!insightsContainer) return;

    const today = new Date();
    
    const currentSunday = new Date(today);
    currentSunday.setDate(today.getDate() - today.getDay());
    currentSunday.setHours(0, 0, 0, 0);

    const currentSaturday = new Date(currentSunday);
    currentSaturday.setDate(currentSunday.getDate() + 6);
    currentSaturday.setHours(23, 59, 59, 999);

    const formatOptions = { month: 'short', day: 'numeric' };
    if (weekLabel) {
        weekLabel.textContent = `Current Week: ${currentSunday.toLocaleDateString(undefined, formatOptions)} – ${currentSaturday.toLocaleDateString(undefined, formatOptions)}`;
    }

    const weekReports = reports.filter(report => {
        const reportDate = new Date(report.date);
        return !isNaN(reportDate) && reportDate >= currentSunday && reportDate <= currentSaturday;
    });

    if (weekReports.length === 0) {
        insightsContainer.innerHTML = `
            <p style="color: #64748b; font-style: italic; margin: 0;">No logs turned in yet for the current Sunday–Saturday week window. As soon as cashiers submit logs, trends will update dynamically here.</p>
        `;
        return;
    }

    let weeklyT = 0;
    let weeklyR = 0;
    const weeklyEmpMap = {};

    weekReports.forEach(report => {
        const t = Number(report.transactions) || 0;
        const r = Number(report.rewards) || 0;
        weeklyT += t;
        weeklyR += r;

        if (!weeklyEmpMap[report.employee]) {
            weeklyEmpMap[report.employee] = { t: 0, r: 0 };
        }
        weeklyEmpMap[report.employee].t += t;
        weeklyEmpMap[report.employee].r += r;
    });

    if (weeklyT === 0) {
        insightsContainer.innerHTML = `
            <p style="color: #64748b; font-style: italic; margin: 0;">Awaiting register activity recordings for this week window block.</p>
        `;
        return;
    }

    const weeklyAvg = (weeklyR / weeklyT) * 100;

    let weeklyLeaderboard = Object.keys(weeklyEmpMap).map(name => {
        const stats = weeklyEmpMap[name];
        const rate = stats.t === 0 ? 0 : (stats.r / stats.t) * 100;
        return { name, rate };
    }).sort((a, b) => b.rate - a.rate);

    const goalStatusText = weeklyAvg >= currentTargetGoal 
        ? `🟢 Currently <strong>pacing above</strong> our target goal of ${currentTargetGoal}%!`
        : `🟡 Pacing slightly below our goal milestone (${currentTargetGoal}%). Let's keep working together to bump this up!`;

    let topThreeHtml = "";
    const topThreeList = weeklyLeaderboard.slice(0, 3);
    
    if (topThreeList.length > 0) {
        const items = topThreeList.map((emp, index) => {
            const medals = ["🥇", "🥈", "🥉"];
            return `<span style="margin-right: 16px;">${medals[index] || "•"} <strong>${emp.name}</strong>: ${emp.rate.toFixed(1)}%</span>`;
        }).join("");
        topThreeHtml = `<p style="margin: 8px 0 0 0;">⭐ <strong>Top Performers:</strong> ${items}</p>`;
    }

    insightsContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 6px;">
            <p style="margin: 0;">📉 <strong>Week-to-Date Trend:</strong> Averaging <strong>${weeklyAvg.toFixed(1)}%</strong> loyalty penetration. ${goalStatusText}</p>
            ${topThreeHtml}
        </div>
    `;
}

function updateGoalProgressBar(weeklyAvg) {

    const goal = GLOBAL_STORE_GOAL || 0;

    const bar = document.getElementById("goalProgressBar");
    const label = document.getElementById("goalPercentLabel");
    const target = document.getElementById("goalTargetLabel");

    if (!bar || !label || !target) return;

    const percent = Math.min(weeklyAvg, 100);

    bar.style.width = percent + "%";
    label.textContent = weeklyAvg.toFixed(1) + "%";
    target.textContent = goal + "%";

    // color logic
    if (weeklyAvg >= goal) {
        bar.style.background = "#22c55e"; // green
    } else if (weeklyAvg >= goal * 0.85) {
        bar.style.background = "#f59e0b"; // amber
    } else {
        bar.style.background = "#ef4444"; // red
    }
}

