import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let allReports = [];
let chartInstance = null;

onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = "index.html"; return; }
    document.body.style.display = "block";
    initializeAnalytics();
});

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("logoutBtn")?.addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = "index.html";
    });
});

async function initializeAnalytics() {
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay()); 
    document.getElementById("startDate").value = sunday.toISOString().split('T')[0];
    document.getElementById("endDate").value = today.toISOString().split('T')[0];

    try {
        const [empSnapshot, reportsSnapshot] = await Promise.all([
            getDocs(collection(db, "employees")),
            getDocs(collection(db, "reports"))
        ]);

        const primarySelect = document.getElementById("primaryEmployee");
        const secondarySelect = document.getElementById("secondaryEmployee");
        
        empSnapshot.forEach(doc => {
            const name = doc.data().name;
            if (name) {
                primarySelect.add(new Option(name, name));
                secondarySelect.add(new Option(name, name));
            }
        });

        allReports = [];
        reportsSnapshot.forEach(doc => allReports.push(doc.data()));

        const inputs = ["primaryEmployee", "secondaryEmployee", "startDate", "endDate"];
        inputs.forEach(id => document.getElementById(id).addEventListener("change", processAndRender));
        
        document.getElementById("compareToggle").addEventListener("change", (e) => {
            document.getElementById("secondaryEmployeeWrapper").style.display = e.target.checked ? "flex" : "none";
            processAndRender();
        });
        
        processAndRender();
    } catch (err) { console.error("Init Error:", err); }
}

function getPen(emp, start, end) {
    const data = allReports.filter(r => r.employee === emp && r.date >= start && r.date <= end);
    const tx = data.reduce((sum, r) => sum + Number(r.transactions || 0), 0);
    const reg = data.reduce((sum, r) => sum + Number(r.rewards || 0), 0);
    return { tx, reg, rate: tx > 0 ? (reg / tx) * 100 : 0 };
}

function getWeekBoundaries() {
    const today = new Date();
    const curStart = new Date(today); curStart.setDate(today.getDate() - today.getDay());
    const prevStart = new Date(curStart); prevStart.setDate(curStart.getDate() - 7);
    const prevEnd = new Date(prevStart); prevEnd.setDate(prevStart.getDate() + 6);
    return {
        cur: { start: curStart.toISOString().split('T')[0], end: today.toISOString().split('T')[0] },
        prev: { start: prevStart.toISOString().split('T')[0], end: prevEnd.toISOString().split('T')[0] }
    };
}

function processAndRender() {
    const emp1 = document.getElementById("primaryEmployee").value;
    const emp2 = document.getElementById("secondaryEmployee").value;
    const isCompare = document.getElementById("compareToggle").checked;
    const start = document.getElementById("startDate").value;
    const end = document.getElementById("endDate").value;

    if (!emp1) return;

    const current = getPen(emp1, start, end);
    document.getElementById("metricPen").textContent = current.rate.toFixed(1) + "%";
    document.getElementById("metricTx").textContent = current.tx.toLocaleString();
    document.getElementById("metricReg").textContent = current.reg.toLocaleString();

    // Comparison Stats
    const compInsight = document.getElementById("compareInsightText");
    if (isCompare && emp2) {
        const comp = getPen(emp2, start, end);
        document.getElementById("compPen").textContent = `vs ${emp2}: ${comp.rate.toFixed(1)}%`;
        document.getElementById("compTx").textContent = `vs ${emp2}: ${comp.tx.toLocaleString()}`;
        document.getElementById("compReg").textContent = `vs ${emp2}: ${comp.reg.toLocaleString()}`;
        
        const diff = current.rate - comp.rate;
        compInsight.textContent = Math.abs(diff) > 0.5 
            ? `${emp1} is ${diff > 0 ? 'outperforming' : 'trailing'} ${emp2} by ${Math.abs(diff).toFixed(1)}% in penetration.`
            : `${emp1} and ${emp2} are performing at a very similar penetration level.`;
    } else {
        document.getElementById("compPen").textContent = "";
        document.getElementById("compTx").textContent = "";
        document.getElementById("compReg").textContent = "";
        compInsight.textContent = "";
    }


    const weeks = getWeekBoundaries();
    const curWeek = getPen(emp1, weeks.cur.start, weeks.cur.end);
    const prevWeek = getPen(emp1, weeks.prev.start, weeks.prev.end);
    const allEmps = [...new Set(allReports.map(r => r.employee))];
    const storeAvg = allEmps.map(e => getPen(e, weeks.cur.start, weeks.cur.end)).filter(s => s.tx > 0).reduce((sum, s, _, arr) => sum + s.rate / arr.length, 0);

    let insight = `<strong>${emp1}</strong> current week penetration is <strong>${curWeek.rate.toFixed(1)}%</strong>. `;
    const trend = curWeek.rate - prevWeek.rate;
    if (prevWeek.tx > 0) insight += Math.abs(trend) > 0.5 ? `Change of <strong>${trend > 0 ? '+' : ''}${trend.toFixed(1)}%</strong> vs last week. ` : "Stable vs last week. ";
    insight += `Store average: <strong>${storeAvg.toFixed(1)}%</strong>. `;
    const diff = curWeek.rate - storeAvg;
    insight += Math.abs(diff) > 0.5 ? `${emp1} is <strong>${diff > 0 ? 'above' : 'below'}</strong> store average by <strong>${Math.abs(diff).toFixed(1)}%</strong>.` : "Performance is currently aligned with the store average.";
    
    document.getElementById("insightSection").style.display = "block";
    document.getElementById("insightText").innerHTML = insight;

    // Render Table & Chart
    const filtered = allReports.filter(r => r.date >= start && r.date <= end);
    const tbody = document.getElementById("reportTable");
    tbody.innerHTML = "";
    filtered.filter(r => r.employee === emp1).sort((a,b) => a.date.localeCompare(b.date)).forEach(r => {
        const t = Number(r.transactions) || 0;
        const reg = Number(r.rewards) || 0;
        tbody.innerHTML += `<tr><td>${r.date}</td><td>${t}</td><td>${reg}</td><td>${t ? ((reg/t)*100).toFixed(1) : "0.0"}%</td></tr>`;
    });

    const dates = [...new Set(filtered.map(r => r.date))].sort();
    const datasets = [{
        label: emp1,
        data: dates.map(d => {
            const entry = filtered.filter(r => r.employee === emp1).find(r => r.date === d);
            return entry ? ((Number(entry.rewards) || 0) / (Number(entry.transactions) || 1)) * 100 : null;
        }),
        borderColor: '#2563eb', tension: 0.2, spanGaps: true
    }];

    if (isCompare && emp2) {
        datasets.push({
            label: emp2,
            data: dates.map(d => {
                const entry = filtered.filter(r => r.employee === emp2).find(r => r.date === d);
                return entry ? ((Number(entry.rewards) || 0) / (Number(entry.transactions) || 1)) * 100 : null;
            }),
            borderColor: '#f97316', tension: 0.2, spanGaps: true
        });
    }

    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(document.getElementById("employeeTrendChart"), {
        type: 'line',
        data: { labels: dates, datasets },
        options: { responsive: true, maintainAspectRatio: false }
    });
}