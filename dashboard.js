// dashboard.js
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
        // Enforce global static benchmark configuration cleanly
        localStorage.setItem("dashboardGoal", GLOBAL_STORE_GOAL);
        
        // Show layout surface securely
        document.body.style.display = "block";
        
        // Initialize listener
        initializeDatabaseListener();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("applyFilters")?.addEventListener("click", () => {
        buildDashboard();
    });
    
    document.getElementById("logoutBtn")?.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "index.html";
        } catch (error) {
            console.error("Error signing out user session:", error);
        }
    });

    document.getElementById("exportCSV")?.addEventListener("click", () => {
        const data = getFilteredReports();
        downloadCSV(data);
    });

    document.getElementById("printReport")?.addEventListener("click", executePrintScoreboard);
});

function initializeDatabaseListener() {
    onSnapshot(collection(db, "reports"), (querySnapshot) => {
        reports = [];
        querySnapshot.forEach((doc) => {
            reports.push(doc.data());
        });
        
        buildDashboard();
    }, (error) => {
        console.error("Live firestore synchronization failed:", error);
    });
}


function getFilteredReports() {
    const rangeSelect = document.getElementById("rangeSelect");
    const range = rangeSelect?.value || "all";

    if (range === "all") return reports;

    const days = parseInt(range, 10);
    if (isNaN(days)) return reports;

    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days);

    return reports.filter(report => {
        const reportDate = new Date(report.date);
        return !isNaN(reportDate) && reportDate >= cutoff;
    });
}


function calculatePercent(transactions, rewards) {
    const t = Number(transactions) || 0;
    const r = Number(rewards) || 0;
    return t === 0 ? 0 : (r / t) * 100;
}


function buildDashboard() {
    const filteredData = getFilteredReports();
    
    const storeAverageEl = document.getElementById("storeAverage");
    const totalReportsEl = document.getElementById("totalReports");
    const employeeCountEl = document.getElementById("employeeCount");
    const topPerformerEl = document.getElementById("topPerformer");

    const activeEmployeesList = [...new Set(reports.map(r => r.employee))];

    if (employeeCountEl) {
        employeeCountEl.textContent = activeEmployeesList.length.toString();
    }
    if (totalReportsEl) {
        totalReportsEl.textContent = filteredData.length.toString();
    }

    generateStoreInsights(GLOBAL_STORE_GOAL);

    if (!filteredData.length) {
        if (storeAverageEl) storeAverageEl.textContent = "0.0%";
        if (topPerformerEl) topPerformerEl.textContent = "N/A";
        clearChartsOnEmpty();
        return;
    }

    let totalTransactions = 0;
    let totalRewards = 0;

    const dailyMap = {};
    const empStats = {};

    filteredData.forEach(report => {
        const t = Number(report.transactions) || 0;
        const r = Number(report.rewards) || 0;

        totalTransactions += t;
        totalRewards += r;

        if (!dailyMap[report.date]) {
            dailyMap[report.date] = { totalT: 0, totalR: 0 };
        }
        dailyMap[report.date].totalT += t;
        dailyMap[report.date].totalR += r;

        if (!empStats[report.employee]) {
            empStats[report.employee] = { t: 0, r: 0 };
        }
        empStats[report.employee].t += t;
        empStats[report.employee].r += r;
    });

    const storeAvg = totalTransactions === 0 ? 0 : (totalRewards / totalTransactions) * 100;
    if (storeAverageEl) {
        storeAverageEl.textContent = storeAvg.toFixed(1) + "%";
    }

    let topEmployeeName = "N/A";
    let topEmployeePercentage = -1;

    Object.keys(empStats).forEach(name => {
        const stats = empStats[name];
        const rate = stats.t === 0 ? 0 : (stats.r / stats.t) * 100;

        if (rate > topEmployeePercentage) {
            topEmployeePercentage = rate;
            topEmployeeName = `${name} (${rate.toFixed(1)}%)`;
        }
    });
    if (topPerformerEl) {
        topPerformerEl.textContent = topEmployeeName;
    }

    renderTrendChart(dailyMap, GLOBAL_STORE_GOAL);
    renderEmployeeChart(empStats);
}


function generateStoreInsights(currentTargetGoal) {
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

// --- VISUAL GRAPH ENGINE SYSTEM CHARTS RENDERERS ---
function renderTrendChart(dailyMap, currentTargetGoal) {
    const trendCanvas = document.getElementById("trendChart");
    if (!trendCanvas) return;

    const sortedDates = Object.keys(dailyMap).sort((a, b) => new Date(a) - new Date(b));
    const trendPoints = sortedDates.map(date => {
        const day = dailyMap[date];
        return day.totalT === 0 ? 0 : ((day.totalR / day.totalT) * 100).toFixed(1);
    });

    const goalLineData = sortedDates.map(() => currentTargetGoal);

    if (trendChart) trendChart.destroy();

    const ctx = trendCanvas.getContext("2d");
    let fillGradient = null;
    if (ctx) {
        fillGradient = ctx.createLinearGradient(0, 0, 0, 200);
        fillGradient.addColorStop(0, "rgba(37, 99, 235, 0.15)");
        fillGradient.addColorStop(1, "rgba(37, 99, 235, 0.0)");
    }

    trendChart = new Chart(trendCanvas, {
        type: "line",
        data: {
            labels: sortedDates.map(d => {
                const parts = d.split('-');
                return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d;
            }),
            datasets: [
                {
                    label: "Store Performance %",
                    data: trendPoints,
                    borderColor: "#2563eb",
                    backgroundColor: fillGradient || "transparent",
                    borderWidth: 3,
                    tension: 0.2,
                    fill: true,
                    pointBackgroundColor: "#2563eb",
                    pointRadius: 4
                },
                {
                    label: `Store Goal (${currentTargetGoal}%)`,
                    data: goalLineData,
                    borderColor: "#ef4444",
                    borderWidth: 2,
                    borderDash: [6, 6],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "top", labels: { boxWidth: 12, font: { weight: 600 } } }
            },
            scales: {
                y: { min: 0, max: 100, grid: { color: "#f1f5f9" }, ticks: { callback: v => v + "%" } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderEmployeeChart(empStats) {
    const empCanvas = document.getElementById("employeeChart");
    if (!empCanvas) return;

    const sortedEmployees = Object.keys(empStats).sort((a, b) => {
        const rateA = empStats[a].t === 0 ? 0 : empStats[a].r / empStats[a].t;
        const rateB = empStats[b].t === 0 ? 0 : empStats[b].r / empStats[b].t;
        return rateB - rateA;
    });

    const labelNames = [];
    const statisticalRates = [];

    sortedEmployees.forEach(name => {
        const item = empStats[name];
        labelNames.push(name);
        statisticalRates.push(((item.r / item.t) * 100 || 0).toFixed(1));
    });

    if (employeeChart) employeeChart.destroy();

    employeeChart = new Chart(empCanvas, {
        type: "bar",
        data: {
            labels: labelNames,
            datasets: [{
                label: "Cashier Score Rate %",
                data: statisticalRates,
                backgroundColor: "#475569",
                hoverBackgroundColor: "#0f172a",
                borderRadius: 6,
                barThickness: 24
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { min: 0, max: 100, grid: { color: "#f1f5f9" }, ticks: { callback: v => v + "%" } },
                x: { grid: { display: false } }
            }
        }
    });
}


function clearChartsOnEmpty() {
    if (trendChart) { trendChart.destroy(); trendChart = null; }
    if (employeeChart) { employeeChart.destroy(); employeeChart = null; }
}

function executePrintScoreboard() {
    const printWindow = window.open("print.html", "_blank");
    if (!printWindow) {
        alert("Pop-up blocked! Please allow pop-ups for this site to view the printable scoreboard.");
    }
}

function downloadCSV(dataset) {
    if (!dataset.length) {
        alert("No target logs matched the active parameters for export extraction.");
        return;
    }

    let csvOutputBody = "Data Record Date,Cashier Identity,Transactions Handled,Rewards Signups,Penetration Rate %\n";

    dataset.forEach(row => {
        const rate = calculatePercent(row.transactions, row.rewards).toFixed(1);
        csvOutputBody += `"${row.date}","${row.employee.replace(/"/g, '""')}",${row.transactions},${row.rewards},${rate}%\n`;
    });

    const fileBlob = new Blob([csvOutputBody], { type: "text/csv;charset=utf-8;" });
    const localBlobUrl = URL.createObjectURL(fileBlob);
    
    const virtualLinkElement = document.createElement("a");
    virtualLinkElement.href = localBlobUrl;
    virtualLinkElement.download = `Store_Rewards_Extract_${new Date().toISOString().split('T')[0]}.csv`;
    
    document.body.appendChild(virtualLinkElement);
    virtualLinkElement.click();
    
    document.body.removeChild(virtualLinkElement);
    URL.revokeObjectURL(localBlobUrl);
}