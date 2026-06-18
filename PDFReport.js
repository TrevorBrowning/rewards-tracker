import { db, GLOBAL_STORE_GOAL } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

function getWeekBounds(d) {
    const date = new Date(d);
    const start = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
    return { start, end };
}

async function init() {
    const params = new URLSearchParams(window.location.search);
    const targetDate = params.get("date") || new Date().toISOString();
    const bounds = getWeekBounds(targetDate);
    const isCurrentWeek = bounds.end >= new Date();
    
    const prevBounds = { 
        start: new Date(bounds.start.getTime() - 7 * 86400000), 
        end: new Date(bounds.end.getTime() - 7 * 86400000) 
    };

    const snapshot = await getDocs(collection(db, "reports"));
    const allData = snapshot.docs.map(d => {
        const r = d.data();
        return { 
            ...r, 
            employee: (r.employee || "Unknown").trim(),
            transactions: Number(r.transactions) || 0,
            rewards: Number(r.rewards) || 0,
            _d: new Date(r.date + "T00:00:00Z") 
        };
    });

    const curData = allData.filter(r => r._d >= bounds.start && r._d <= bounds.end);
    const prevData = allData.filter(r => r._d >= prevBounds.start && r._d <= prevBounds.end);

    const cur = compute(curData);
    const prev = compute(prevData);
    const missed = Math.max(0, (cur.t * (GLOBAL_STORE_GOAL / 100)) - cur.r);


    document.getElementById("dateRange").textContent = `${bounds.start.toLocaleDateString()} – ${bounds.end.toLocaleDateString()}`;
    document.getElementById("summary").innerHTML = `
        <div class="stat-card"><h3>Avg Rate</h3><p>${cur.avg.toFixed(1)}%</p></div>
        <div class="stat-card"><h3>Missed Opps</h3><p>${Math.floor(missed)}</p></div>
        <div class="stat-card"><h3>Total Txns</h3><p>${cur.t}</p></div>
        <div class="stat-card"><h3>Signups</h3><p>${cur.r}</p></div>
    `;

    document.getElementById("analysis").innerHTML = `
        <strong>Performance Insight:</strong> Based on ${isCurrentWeek ? "current velocity" : "historical data"}, the store average ${isCurrentWeek ? "is" : "was"} <strong>${cur.avg.toFixed(1)}%</strong>. 
        Performance ${cur.avg >= prev.avg ? "improved" : "declined"} compared to the previous week's <strong>${prev.avg.toFixed(1)}%</strong>.
    `;


    const dailyBody = document.getElementById("dailyBody");
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dailyBody.innerHTML = days.map(day => {
        const dData = curData.filter(r => r._d.toLocaleDateString('en-US', {weekday:'short', timeZone:'UTC'}) === day);
        const c = compute(dData);
        return `<tr><td>${day}</td><td>${c.t}</td><td>${c.r}</td><td>${c.avg.toFixed(1)}%</td></tr>`;
    }).join('');


    const empBody = document.getElementById("empBody");
    const empMap = {};
    curData.forEach(r => {
        if(!empMap[r.employee]) empMap[r.employee] = {t:0, r:0};
        empMap[r.employee].t += r.transactions;
        empMap[r.employee].r += r.rewards;
    });

    const prevMap = {};
    prevData.forEach(r => {
        if(!prevMap[r.employee]) prevMap[r.employee] = {t:0, r:0};
        prevMap[r.employee].t += r.transactions;
        prevMap[r.employee].r += r.rewards;
    });

    empBody.innerHTML = Object.entries(empMap).sort((a,b) => {
        const rateA = a[1].t ? (a[1].r/a[1].t) : 0;
        const rateB = b[1].t ? (b[1].r/b[1].t) : 0;
        return rateB - rateA;
    }).map(([name, v]) => {
        const rate = v.t ? (v.r/v.t)*100 : 0;
        const pStats = prevMap[name] || {t: 0, r: 0};
        const pRate = pStats.t > 0 ? (pStats.r/pStats.t)*100 : 0;
        const diff = rate - pRate;
        
        return `<tr>
            <td><strong>${name}</strong></td><td>${v.t}</td><td>${v.r}</td><td>${rate.toFixed(1)}%</td>
            <td>${pRate.toFixed(1)}%</td>
            <td class="${diff >= 0 ? 'trend-up' : 'trend-down'}">${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(1)}%</td>
        </tr>`;
    }).join('');
}

function compute(d) {
    let t = d.reduce((a,b)=>a+(Number(b.transactions)||0),0);
    let r = d.reduce((a,b)=>a+(Number(b.rewards)||0),0);
    return { t, r, avg: t ? (r/t)*100 : 0 };
}

document.addEventListener("DOMContentLoaded", init);