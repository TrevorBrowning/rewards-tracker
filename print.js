import { db } from "./firebase-config.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const targetGoal = parseFloat(localStorage.getItem("dashboardGoal")) || 75;

function parseLocalDate(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date(dateStr);
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

function getPreviousCorporateWeek() {
    const today = new Date();
    const currentSunday = new Date(today);
    currentSunday.setDate(today.getDate() - today.getDay());
    
    const prevSunday = new Date(currentSunday);
    prevSunday.setDate(currentSunday.getDate() - 7);
    prevSunday.setHours(0, 0, 0, 0);

    const prevSaturday = new Date(prevSunday);
    prevSaturday.setDate(prevSunday.getDate() + 6);
    prevSaturday.setHours(23, 59, 59, 999);

    return { start: prevSunday, end: prevSaturday };
}

const corporateWeek = getPreviousCorporateWeek();

const formatDateString = (dateObj) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const startDateStr = formatDateString(corporateWeek.start);
const endDateStr = formatDateString(corporateWeek.end);

async function buildWeeklyPrintout() {
    try {
   
        const employeesSnapshot = await getDocs(collection(db, "employees"));
        const employeeAggregates = {};
        
        employeesSnapshot.forEach(doc => {
            const empData = doc.data();
            if (empData.name) {
         
                employeeAggregates[empData.name] = { name: empData.name, t: 0, r: 0, activeThisWeek: false };
            }
        });


        const reportsRef = collection(db, "reports");
        const q = query(reportsRef, where("date", ">=", startDateStr), where("date", "<=", endDateStr));
        const querySnapshot = await getDocs(q);
        
        let totalTransactionsCount = 0;
        let totalRewardsSignups = 0;
        let singleDayRecordHigh = 0;

        querySnapshot.forEach(doc => {
            const r = doc.data();
            const t = Number(r.transactions) || 0;
            const rewards = Number(r.rewards) || 0;
            const dailyRate = t === 0 ? 0 : (rewards / t) * 100;

            totalTransactionsCount += t;
            totalRewardsSignups += rewards;

            if (dailyRate > singleDayRecordHigh) {
                singleDayRecordHigh = dailyRate;
            }

            if (employeeAggregates[r.employee]) {
                employeeAggregates[r.employee].t += t;
                employeeAggregates[r.employee].r += rewards;
                if (t > 0) employeeAggregates[r.employee].activeThisWeek = true;
            } else {
                employeeAggregates[r.employee] = { name: r.employee, t: t, r: rewards, activeThisWeek: true };
            }
        });

        const leaderboard = Object.values(employeeAggregates)
            .map(emp => {
                return {
                    name: emp.name,
                    transactions: emp.t,
                    rewards: emp.r,
                    rate: emp.t === 0 ? 0 : (emp.r / emp.t) * 100,
                    active: emp.activeThisWeek
                };
            })
         
            .filter(emp => emp.transactions > 0)
           
            .sort((a, b) => b.rate - a.rate);

        const storeAverageRate = totalTransactionsCount === 0 ? 0 : (totalRewardsSignups / totalTransactionsCount) * 100;

        document.getElementById("storeAvg").textContent = storeAverageRate.toFixed(1) + "%";
        document.getElementById("totalTransactions").textContent = totalTransactionsCount.toLocaleString();
        document.getElementById("bestDay").textContent = singleDayRecordHigh.toFixed(1) + "%";
        
        const topStar = leaderboard[0];
        document.getElementById("topPerformer").textContent = topStar ? topStar.name : "N/A";

        const storeAvgCard = document.getElementById("storeAvgCard");
        if (storeAvgCard && storeAverageRate >= targetGoal) {
            storeAvgCard.classList.add("success");
        }


        const podiumSection = document.getElementById("podiumSection");
        const podiumGrid = document.getElementById("podiumGrid");
        const podiumEligible = leaderboard.slice(0, 3);

        if (podiumEligible.length > 0 && podiumGrid) {
            podiumSection.style.display = "block";
            const medals = ["🥇", "🥈", "🥉"];
            podiumGrid.innerHTML = podiumEligible.map((emp, idx) => `
                <div class="podium-badge">
                    <span class="podium-rank">${medals[idx]}</span>
                    <div class="podium-info">
                        <span class="podium-name">${emp.name}</span>
                        <span class="podium-rate">${emp.rate.toFixed(1)}% Pen.</span>
                    </div>
                </div>
            `).join('');
        } else if (podiumSection) {
            podiumSection.style.display = "none";
        }

        const tbody = document.getElementById("reportBody");
        const tfoot = document.getElementById("reportFoot");

        if (tbody) {
            tbody.innerHTML = "";

            if (leaderboard.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748b; padding:30px; font-style:italic;">No active cashier performance entries recorded in Firestore for this historical weekly window.</td></tr>`;
                if (tfoot) tfoot.style.display = "none";
            } else {
                leaderboard.forEach((cashier, index) => {
                    const row = document.createElement("tr");
                    const hitsGoal = cashier.rate >= targetGoal;
                    const statusBadge = hitsGoal 
                        ? `<span class="status-badge met">🎉 Hit Target</span>` 
                        : `<span class="status-badge pending">Pacing</span>`;

                    row.innerHTML = `
                        <td class="col-left"><strong>#${index + 1}</strong></td>
                        <td class="col-left"><strong>${cashier.name}</strong></td>
                        <td class="col-right">${cashier.transactions.toLocaleString()}</td>
                        <td class="col-right">${cashier.rewards.toLocaleString()}</td>
                        <td class="col-right" style="font-weight:700; color:${hitsGoal ? '#16a34a' : '#475569'};">${cashier.rate.toFixed(1)}%</td>
                        <td class="col-center">${statusBadge}</td>
                    `;
                    tbody.appendChild(row);
                });

                if (tfoot) {
                    tfoot.style.display = "table-footer-group";
                    document.getElementById("footTotalTx").textContent = totalTransactionsCount.toLocaleString();
                    document.getElementById("footTotalReg").textContent = totalRewardsSignups.toLocaleString();
                    document.getElementById("footTotalRate").textContent = storeAverageRate.toFixed(1) + "%";
                }
            }
        }
        
        const formatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        document.getElementById("weekRange").textContent = 
            `Official Week: ${corporateWeek.start.toLocaleDateString(undefined, formatOptions)} – ${corporateWeek.end.toLocaleDateString(undefined, formatOptions)}`;

        const generationDate = new Date();
        document.getElementById("printTimestamp").textContent = `Compiled: ${generationDate.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})} at ${generationDate.toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}`;

    } catch (error) {
        console.error("Error building print view layout: ", error);
    }
}

buildWeeklyPrintout();