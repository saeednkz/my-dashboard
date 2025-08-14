import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs, serverTimestamp, Timestamp, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCnI4Pe7kI41sa6NpnVXIOStsTOpBh7JDg",
    authDomain: "nik-accounting-app.firebaseapp.com",
    projectId: "nik-accounting-app",
    storageBucket: "nik-accounting-app.appspot.com",
    messagingSenderId: "144843139100",
    appId: "1:144843139100:web:106b37fd9de88129dc17d9"
};

// --- GLOBAL STATE ---
let db, auth;
let ALL_TRANSACTIONS = [];
let currencyPools = {};
let users = [];
let roles = {};
let ALL_SUPPLIERS = [];
let currentUser = null;
let authUser = null;
let KPI_TARGETS = {};

let unsubscribeTransactions, unsubscribeUsers, unsubscribeRoles, unsubscribeSuppliers;
let appInitialized = false;
let isProcessingPools = false; 

// --- DOM Elements ---
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const loginPage = document.getElementById('login-page');
const mainApp = document.getElementById('main-app');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const allPermissions = { 
    view_dashboard: 'مشاهده داشبورد', 
    view_transactions: 'مشاهده تراکنش‌ها', 
    edit_transactions: 'اصلاح تراکنش‌ها', 
    create_transactions: 'ایجاد تراکنش', 
    export_data: 'خروجی داده', 
    manage_users: 'مدیریت کاربران', 
    manage_pools: 'مدیریت استخرها',
    manage_suppliers: 'مدیریت تامین‌کنندگان'
};


// --- CORE APP LOGIC ---
async function initializeAppForUser(user) {
    authUser = user;
    const appId = firebaseConfig.projectId;
    const rolesRef = collection(db, `artifacts/${appId}/public/data/roles`);
    const usersRef = collection(db, `artifacts/${appId}/public/data/users`);

    const rolesSnapshot = await getDocs(rolesRef);
    roles = {};
    rolesSnapshot.forEach(doc => {
        roles[doc.id] = { id: doc.id, ...doc.data() };
    });

    const usersSnapshot = await getDocs(usersRef);
    users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (rolesSnapshot.empty) {
        console.log("No roles found. Creating default Admin role...");
        await setDoc(doc(rolesRef, "Admin"), { name: 'ادمین کل', permissions: Object.keys(allPermissions) });
        const newRolesSnapshot = await getDocs(rolesRef);
        newRolesSnapshot.forEach(doc => {
            roles[doc.id] = { id: doc.id, ...doc.data() };
        });
    }

    let userProfile = users.find(u => u.uid === authUser.uid);

    if (!userProfile) {
        console.log(`User profile for ${authUser.email} not found. Creating one now...`);
        const isFirstUser = users.length === 0;
        const newUserProfile = {
            name: authUser.displayName || authUser.email.split('@')[0],
            email: authUser.email,
            role: isFirstUser ? 'Admin' : 'Analyst',
            uid: authUser.uid
        };
        const docRef = await addDoc(usersRef, newUserProfile);
        userProfile = { id: docRef.id, ...newUserProfile };
        users.push(userProfile);
    }
    
    currentUser = { ...authUser, ...userProfile };
    
    console.log("App is ready! Initializing UI with user:", currentUser);
    appInitialized = true;
    
    loginPage.classList.add('hidden');
    mainApp.classList.remove('hidden');
    loadingOverlay.style.display = 'none';

    initializeUI();
    setupRealtimeListeners();
}

function setupDashboard() {
    const JALALI_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
    const JALALI_QUARTERS = ["بهار (فروردین-خرداد)", "تابستان (تیر-شهریور)", "پاییز (مهر-آذر)", "زمستان (دی-اسفند)"];
    const yearFilter = document.getElementById('year-filter');
    const intervalTypeFilter = document.getElementById('interval-type-filter');
    const periodFilter = document.getElementById('period-filter');
    
    function displayCurrentTime() {
        const datetimeEl = document.getElementById('current-datetime');
        if (!datetimeEl) return;
        const updateTime = () => {
            const now = new Date();
            const options = { timeZone: 'Asia/Tehran', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit', calendar: 'persian' };
            const formattedDate = new Intl.DateTimeFormat('fa-IR', options).format(now);
            datetimeEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span>${formattedDate.replace('، ساعت', ' |')}</span>`;
        };
        updateTime();
        setInterval(updateTime, 60000);
    }

    // جایگزین کنید
// START: Replace the entire function with this corrected version
function populateDashboardFilters() {
    const yearFilter = document.getElementById('year-filter');
    const intervalTypeFilter = document.getElementById('interval-type-filter');
    const periodFilter = document.getElementById('period-filter');

    // A more reliable way to get current Jalali date parts
    const now = new persianDate(); // Create a new persianDate object for the current moment
    const currentJalaliYear = now.year();
    const currentJalaliMonth = now.month(); // This gives the month number (1 for Farvardin)

    yearFilter.innerHTML = '';
    for (let year = 1397; year <= currentJalaliYear; year++) {
        yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
    }

    intervalTypeFilter.innerHTML = `<option value="monthly">ماهیانه</option><option value="quarterly">فصلی</option><option value="yearly">سالیانه</option>`;

    // This part remains the same
    updatePeriodFilter();

    // Set default values to current year and month
    yearFilter.value = currentJalaliYear;
    intervalTypeFilter.value = 'monthly';
    updatePeriodFilter();
    periodFilter.value = currentJalaliMonth - 1; // Dropdown is 0-indexed
}
// END: Replacement block

    function updatePeriodFilter() {
        const intervalType = intervalTypeFilter.value;
        periodFilter.innerHTML = '';
        periodFilter.style.display = 'block';
        if (intervalType === 'monthly') {
            JALALI_MONTHS.forEach((month, index) => { periodFilter.innerHTML += `<option value="${index}">${month}</option>`; });
        } else if (intervalType === 'quarterly') {
            JALALI_QUARTERS.forEach((q, index) => { periodFilter.innerHTML += `<option value="${index}">${q}</option>`; });
        } else {
            periodFilter.style.display = 'none';
        }
    }

    function getSelectedDateRange() {
        const jalaliYear = parseInt(yearFilter.value);
        const interval = intervalTypeFilter.value;
        const period = parseInt(periodFilter.value); 
        let startDate, endDate;

        if (interval === 'yearly') {
            startDate = new persianDate([jalaliYear, 1, 1]).toDate();
            endDate = new persianDate([jalaliYear + 1, 1, 1]).toDate();
            endDate.setDate(endDate.getDate() - 1);
        } else if (interval === 'quarterly') {
            const startMonth = period * 3 + 1;
            const endMonth = startMonth + 2;
            startDate = new persianDate([jalaliYear, startMonth, 1]).toDate();
            const endMonthDays = new persianDate([jalaliYear, endMonth, 1]).daysInMonth();
            endDate = new persianDate([jalaliYear, endMonth, endMonthDays]).toDate();
        } else { // monthly
            const month = period + 1;
            startDate = new persianDate([jalaliYear, month, 1]).toDate();
            const endMonthDays = new persianDate([jalaliYear, month, 1]).daysInMonth();
            endDate = new persianDate([jalaliYear, month, endMonthDays]).toDate();
        }
        endDate.setHours(23, 59, 59, 999);
        return { startDate, endDate };
    }

    function filterDashboardData() {
        const { startDate, endDate } = getSelectedDateRange();
        return ALL_TRANSACTIONS.filter(t => t.orderdate >= startDate && t.orderdate <= endDate);
    }

    updateDashboardView = function() {
        if(!appInitialized) return;
        const data = filterDashboardData();
        renderKPIs(data);
        renderSalesProfitChart(data);
        renderProfitCompositionChart(data);
            renderOrderCountChart(data);
    renderAssetCompositionChart();
    }

// START: Replace the entire renderKPIs function with this final version
function renderKPIs(data) {
    const kpiGrid = document.getElementById('kpi-grid');
    if (!kpiGrid) return;
    kpiGrid.innerHTML = '';

    // 1. Calculate all values first
    const settledData = data.filter(d => d.costBasisStatus !== 'pending');
    const salesOrders = settledData.filter(d => d.services_type === 'buy');
    const buyOrders = settledData.filter(d => d.services_type === 'sell');
    
    const kpiValues = {
        pendingTxCount: ALL_TRANSACTIONS.filter(d => d.costBasisStatus === 'pending').length,
        totalSalesVolume: salesOrders.reduce((sum, d) => sum + (parseFloat(d.Total_Amount) || 0), 0),
        totalBuyVolume: buyOrders.reduce((sum, d) => sum + (parseFloat(d.Total_Amount) || 0), 0),
        totalNetProfit: settledData.reduce((sum, d) => sum + (parseFloat(d.NetProfit) || 0), 0),
        salesOrdersCount: salesOrders.length,
        buyOrdersCount: buyOrders.length,
        numVipOrders: settledData.filter(d => (parseFloat(d.Vip_Amount) || 0) > 0).length,
        avgProfitPerOrder: settledData.length > 0 ? (settledData.reduce((sum, d) => sum + (parseFloat(d.NetProfit) || 0), 0)) / settledData.length : 0,
        networkFeeProfit: settledData.reduce((sum, d) => {
            const price = parseFloat(d.currency_price) || 0;
            const networkWage = parseFloat(d.Network_Wage || d['Network Wage'] || 0);
            const actualNetworkWage = parseFloat(d.ActualNetwork_Wage || d['ActualNetwork Wage'] || 0);
            const profitPerTx = (networkWage - actualNetworkWage) * price;
            return sum + (isNaN(profitPerTx) ? 0 : profitPerTx);
        }, 0),
        totalAssetValue: Object.values(currencyPools).reduce((sum, pool) => sum + (pool.quantity * pool.weightedAvgCost), 0)
    };

    // 2. Define all KPI cards with their metadata
    const kpiDefinitions = [
        { key: 'pendingTxCount', label: 'تراکنش‌های در انتظار تسویه', unit: 'عدد', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', clickable: true },
        { key: 'totalSalesVolume', label: 'حجم کل فروش به مشتری', unit: 'تومان', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01' },
        { key: 'totalBuyVolume', label: 'حجم کل خرید از مشتری', unit: 'تومان', icon: 'M3 10h18M7 15h1m4 0h1m4 0h1m-1-5h1.5a2.5 2.5 0 0 0 0-5H18' },
        { key: 'totalNetProfit', label: 'سود خالص (نهایی شده)', unit: 'تومان', icon: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6' },
        { key: 'salesOrdersCount', label: 'تعداد فروش به مشتری', unit: 'عدد', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z' },
        { key: 'buyOrdersCount', label: 'تعداد خرید از مشتری', unit: 'عدد', icon: 'M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4L5 9z' },
        { key: 'numVipOrders', label: 'تعداد سفارش‌های VIP', unit: 'عدد', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
        { key: 'avgProfitPerOrder', label: 'میانگین سود هر سفارش', unit: 'تومان', icon: 'M17 9V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2m2 4h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm-3-9h2' },
        { key: 'networkFeeProfit', label: 'سود کارمزد شبکه', unit: 'تومان', icon: 'M8.684 13.342C8.886 13.545 9 13.848 9 14.158V15.5a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-1.342c0-.31.114-.613.316-.816l8-8c.202-.202.505-.316.816-.316h1.342a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5h-1.582c-.31 0-.613.114-.816.316l-8 8Z' },
        { key: 'totalAssetValue', label: 'ارزش کل دارایی‌ها (استخر)', unit: 'تومان', icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 9.579a.75.75 0 01.428-.674l4.002-2.223a.75.75 0 011.08 1.006l-4.002 2.223a.75.75 0 01-1.08-1.006zM11.25 10.5a.75.75 0 100-1.5.75.75 0 000 1.5zM9 12.579a.75.75 0 01.428-.674l4.002-2.223a.75.75 0 11.6 1.342l-4.002 2.223a.75.75 0 01-1.028-.668z' }
    ];

    // 3. Loop through definitions and render each card
    kpiDefinitions.forEach(kpi => {
        const card = document.createElement('div');
        const currentValue = kpiValues[kpi.key];
        const formattedValue = formatCurrency(currentValue, (kpi.unit === 'عدد' ? 0 : 2));

        card.className = 'glass-card p-4 rounded-xl flex flex-col gap-2 fade-in';
        if (kpi.clickable) {
             card.classList.add('cursor-pointer', 'hover:bg-slate-800/50');
             card.addEventListener('click', showPendingTransactionsModal);
        }
        
        let progressBarHtml = '';
        const target = KPI_TARGETS[kpi.key];
        const currentPeriodType = document.getElementById('interval-type-filter').value;

        if (target && target.value > 0 && target.period === currentPeriodType) {
            const progress = Math.min((currentValue / target.value) * 100, 100);
            
            progressBarHtml = `
                <div class="space-y-1 pt-1">
                    <div class="w-full bg-slate-700 rounded-full h-2">
                        <div class="bg-cyan-400 h-2 rounded-full" style="width: ${progress}%"></div>
                    </div>
                    <div class="text-xs text-slate-400 flex justify-between">
                        <span>${Math.round(progress)}%</span>
                        <span>هدف: ${formatCurrency(target.value, 0)}</span>
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="flex items-start gap-4">
                <div class="bg-slate-800/60 h-10 w-10 shrink-0 flex items-center justify-center rounded-lg">
                    <svg class="h-5 w-5 ${kpi.key === 'pendingTxCount' ? 'text-amber-400' : 'text-cyan-400'}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="${kpi.icon}" />
                    </svg>
                </div>
                <div class="min-w-0 flex-1">
                    <p class="text-sm text-slate-400 mb-1 truncate">${kpi.label}</p>
                    <!-- FIXED: Changed break-words to break-all for guaranteed wrapping -->
                    <p class="text-xl font-bold text-white flex items-baseline break-all">${formattedValue} <span class="text-xs mr-1">${kpi.unit}</span></p>
                </div>
            </div>
            ${progressBarHtml}
        `;
        kpiGrid.appendChild(card);
    });
}
// END: Replacement block
    
    function renderSalesProfitChart(data) {
        const settledData = data.filter(d => d.costBasisStatus !== 'pending' && d.costBasisStatus !== 'pending_import');
        const { startDate, endDate } = getSelectedDateRange();
        const selectedPeriod = periodFilter.options[periodFilter.selectedIndex].text;
        document.getElementById('sales-profit-chart-title').textContent = `مقایسه فروش و سود - ${selectedPeriod}`;
        const aggregatedData = {};
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            aggregatedData[d.toISOString().split('T')[0]] = { sales: 0, profit: 0 };
        }
        settledData.forEach(t => {
            const key = t.orderdate.toISOString().split('T')[0];
            if (aggregatedData[key]) {
                if (t.services_type === 'buy') aggregatedData[key].sales += (parseFloat(t.Total_Amount) || 0);
                aggregatedData[key].profit += (parseFloat(t.NetProfit) || 0);
            }
        });
        const labels = Object.keys(aggregatedData);
        const salesData = Object.values(aggregatedData).map(d => d.sales);
        const profitData = Object.values(aggregatedData).map(d => d.profit);
        const ctx = document.getElementById('salesProfitChart').getContext('2d');
        if(salesProfitChart) salesProfitChart.destroy();
        const yAxisCallback = (value) => {
            if (value === 0) return '۰';
            return `${new Intl.NumberFormat('fa-IR').format(value / 1000000)} M`;
        };
        salesProfitChart = new Chart(ctx, {
            type: 'line',
            data: { 
                labels, 
                datasets: [
                    { 
                        label: 'سود خالص', 
                        data: profitData, 
                        borderColor: '#f59e0b', 
                        backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                        fill: true, 
                        borderWidth: 2, 
                        tension: 0.4, 
                        pointRadius: 0, 
                        pointHoverRadius: 6, 
                        pointBackgroundColor: '#f59e0b',
                        // yAxisID: 'y1'  <-- این خط حذف شد
                    }, 
                    { 
                        label: 'حجم فروش', 
                        data: salesData, 
                        backgroundColor: 'rgba(34, 211, 238, 0.1)', 
                        borderColor: '#22d3ee', 
                        fill: true, 
                        borderWidth: 2, 
                        tension: 0.4, 
                        pointRadius: 0, 
                        pointHoverRadius: 6, 
                        pointBackgroundColor: '#22d3ee',
                        // yAxisID: 'y'    <-- این خط حذف شد
                    }
                ] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                interaction: { intersect: false, mode: 'index' }, 
                plugins: { 
                    legend: { position: 'top', align: 'end', labels: { color: '#94a3b8', usePointStyle: true, boxWidth: 8, font: { family: 'Vazirmatn' } } }, 
                    tooltip: { rtl: true, textDirection: 'rtl', backgroundColor: 'rgba(2, 6, 23, 0.8)', titleFont: { family: 'Vazirmatn' }, bodyFont: { family: 'Vazirmatn' }, padding: 12, cornerRadius: 8, callbacks: { title: (tooltipItems) => new Date(tooltipItems[0].label).toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), label: (c) => `${c.dataset.label}: ${formatCurrency(c.raw,0)} تومان` } } 
                }, 
                scales: { 
                    x: { 
                        grid: { display: false }, 
                        ticks: { color: '#94a3b8', font: { family: 'Vazirmatn' }, maxRotation: 0, autoSkip: true, maxTicksLimit: 15, callback: (v, i, values) => new Date(labels[i]).toLocaleDateString('fa-IR', {day: 'numeric'}) } 
                    }, 
                    y: { // فقط یک محور عمودی باقی می‌ماند
                        position: 'right', 
                        beginAtZero: true, 
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }, 
                        ticks: { color: '#94a3b8', font: { family: 'Vazirmatn' }, callback: yAxisCallback } 
                    },
                    // y1: { ... }  <-- کل این بلاک حذف شد
                } 
            }
        });
    }
// START: Replace the entire function with this corrected version
function renderProfitCompositionChart(data) {
    const settledData = data.filter(d => d.costBasisStatus !== 'pending' && d.costBasisStatus !== 'pending_import');
    const selectedPeriod = periodFilter.options[periodFilter.selectedIndex].text;
    document.getElementById('profit-composition-chart-title').textContent = `ترکیب سود خالص - ${selectedPeriod}`;
    
    const getValue = (transaction, keyWithUnderscore, keyWithSpace) => {
        const value = transaction[keyWithUnderscore] || transaction[keyWithSpace] || 0;
        return parseFloat(value);
    };

    // Initialize all profit components to zero
    let marginProfit = 0;
    let totalFixWage = 0;
    let totalVipAmount = 0;
    let networkFeeProfit = 0;

    // Calculate each component directly by iterating through transactions
    settledData.forEach(d => {
        const price = getValue(d, 'currency_price', 'currency_price');
        const networkWage = getValue(d, 'Network_Wage', 'Network Wage');
        const actualNetworkWage = getValue(d, 'ActualNetwork_Wage', 'ActualNetwork Wage');
        
        totalFixWage += getValue(d, 'Fix_Wage', 'Fix Wage');
        totalVipAmount += getValue(d, 'Vip_Amount', 'Vip Amount');
        
        const currentNetworkFeeProfit = (networkWage - actualNetworkWage) * price;
        if (!isNaN(currentNetworkFeeProfit)) {
            networkFeeProfit += currentNetworkFeeProfit;
        }

        // Margin profit is only generated from 'buy' (sales to customer) transactions
        if (d.services_type === 'buy') {
            const costBasis = getValue(d, 'Cost_Basis', 'Cost_Basis');
            const amount = getValue(d, 'currency_amount', 'currency_amount');
            // Margin is the difference between sale price and cost basis, multiplied by amount
            const currentMarginProfit = (price - costBasis) * amount;
            if (!isNaN(currentMarginProfit)) {
                marginProfit += currentMarginProfit;
            }
        }
    });

    const chartData = [marginProfit, totalFixWage, totalVipAmount, networkFeeProfit].map(v => v > 0 ? v : 0);
    const labels = ['سود مارجین', 'کارمزد ثابت', 'کارمزد VIP', 'سود کارمزد شبکه'];
    const colors = ['#0ea5e9', '#10b981', '#f97316', '#8b5cf6'];
    const ctx = document.getElementById('profitCompositionChart').getContext('2d');
    
    if(profitCompositionChart) profitCompositionChart.destroy();
    
    profitCompositionChart = new Chart(ctx, {
        type: 'doughnut',
        data: { 
            labels, 
            datasets: [{ 
                data: chartData, 
                backgroundColor: colors, 
                borderColor: '#020617', 
                borderWidth: 4, 
                hoverOffset: 12 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            cutout: '70%', 
            plugins: { 
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        color: '#94a3b8', 
                        usePointStyle: true, 
                        boxWidth: 8, 
                        padding: 20, 
                        font: { family: 'Vazirmatn' } 
                    } 
                }, 
                tooltip: { 
                    rtl: true, 
                    textDirection: 'rtl', 
                    backgroundColor: 'rgba(2, 6, 23, 0.8)', 
                    titleFont: { family: 'Vazirmatn' }, 
                    bodyFont: { family: 'Vazirmatn' }, 
                    padding: 12, 
                    cornerRadius: 8, 
                    callbacks: { 
                        label: (c) => `${c.label}: ${formatCurrency(c.raw,0)} تومان` 
                    } 
                } 
            } 
        }
    });
}
// END: Replacement block
    // START: Add the first new chart function
function renderOrderCountChart(data) {
    const settledData = data.filter(d => d.costBasisStatus !== 'pending' && d.costBasisStatus !== 'pending_import');
    const { startDate, endDate } = getSelectedDateRange();

    const aggregatedData = {};
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        aggregatedData[d.toISOString().split('T')[0]] = { salesCount: 0, buyCount: 0 };
    }

    settledData.forEach(t => {
        const key = t.orderdate.toISOString().split('T')[0];
        if (aggregatedData[key]) {
            if (t.services_type === 'buy') { // فروش به مشتری
                aggregatedData[key].salesCount++;
            } else if (t.services_type === 'sell') { // خرید از مشتری
                aggregatedData[key].buyCount++;
            }
        }
    });

    const labels = Object.keys(aggregatedData);
    const salesData = Object.values(aggregatedData).map(d => d.salesCount);
    const buyData = Object.values(aggregatedData).map(d => d.buyCount);

    const ctx = document.getElementById('orderCountChart').getContext('2d');
    if(orderCountChart) orderCountChart.destroy();

    orderCountChart = new Chart(ctx, {
        type: 'bar', // Or 'line' if you prefer
        data: { 
            labels, 
            datasets: [
                { 
                    label: 'فروش به مشتری', 
                    data: salesData, 
                    backgroundColor: '#22d3ee',
                    borderColor: '#22d3ee',
                },
                { 
                    label: 'خرید از مشتری', 
                    data: buyData, 
                    backgroundColor: '#f59e0b',
                    borderColor: '#f59e0b',
                }
            ] 
        },
       options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'top', align: 'end', labels: { color: '#94a3b8', font: { family: 'Vazirmatn' } } },
       tooltip: {
    rtl: true,
    textDirection: 'rtl',
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    titleFont: { family: 'Vazirmatn' },
    bodyFont: { family: 'Vazirmatn' },
    padding: 12,
    cornerRadius: 8,
    callbacks: {
        // START: This title function was missing
        title: (tooltipItems) => {
            return new Date(tooltipItems[0].label).toLocaleDateString('fa-IR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        },
        // END: This title function was missing
        label: (c) => `${c.dataset.label}: ${c.raw} عدد`
    }
}
    },
    scales: { 
        x: { 
            ticks: { 
                color: '#94a3b8',
                font: { family: 'Vazirmatn' },
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 15,
                // START: This callback function was missing
                callback: (v, i) => new Date(labels[i]).toLocaleDateString('fa-IR', {day: 'numeric'})
                // END: This callback function was missing
            } 
        }, 
        y: { 
            beginAtZero: true, 
            ticks: { 
                color: '#94a3b8' 
            } 
        } 
    }
}
    });
}
// END: Add the first new chart function

// START: Add the second new chart function
function renderAssetCompositionChart() {
    const labels = [];
    const chartData = [];
    const colors = ['#0ea5e9', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#f59e0b', '#64748b'];

    let colorIndex = 0;
    for (const slug in currencyPools) {
        const pool = currencyPools[slug];
        const assetValue = pool.quantity * pool.weightedAvgCost;

        if (assetValue > 0) {
            labels.push(slug.toUpperCase());
            chartData.push(assetValue);
        }
    }

    const ctx = document.getElementById('assetCompositionChart').getContext('2d');
    if(assetCompositionChart) assetCompositionChart.destroy();

    assetCompositionChart = new Chart(ctx, {
        type: 'doughnut',
        data: { 
            labels, 
            datasets: [{ 
                data: chartData, 
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#020617', 
                borderWidth: 4 
            }] 
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Vazirmatn' } } },
                tooltip: { rtl: true, textDirection: 'rtl', callbacks: { label: (c) => `${c.label}: ${formatCurrency(c.raw, 0)} تومان` } }
            }
        }
    });
}
// END: Add the second new chart function

    displayCurrentTime();
    populateDashboardFilters();
    [yearFilter, intervalTypeFilter, periodFilter].forEach(el => el.addEventListener('change', () => {
        if(el.id === 'interval-type-filter') updatePeriodFilter();
        updateDashboardView();
    }));
}

function setupTransactionsPage() {
    $(".persian-datepicker").persianDatepicker({
        format: 'YYYY/MM/DD', timeZone: 'Asia/Tehran', initialValue: false,
        onSelect: () => { currentPage = 1; filterAndRenderTransactions(); }
    });
    const searchInput = document.getElementById('tx-search-input');
    const typeFilter = document.getElementById('tx-type-filter');
    const currencyFilter = document.getElementById('tx-currency-filter');

    searchInput.addEventListener('input', () => { currentPage = 1; filterAndRenderTransactions(); });
    typeFilter.addEventListener('change', () => { currentPage = 1; filterAndRenderTransactions(); });
    currencyFilter.addEventListener('change', () => { currentPage = 1; filterAndRenderTransactions(); });
    
    document.querySelectorAll('.persian-datepicker').forEach(input => {
        input.addEventListener('input', (e) => { if(e.target.value === '') filterAndRenderTransactions(); });
    });
    document.getElementById('export-csv-btn').addEventListener('click', exportToCSV);
    document.getElementById('add-transaction-btn').addEventListener('click', () => openTransactionModal());
    document.getElementById('import-csv-btn').addEventListener('click', () => document.getElementById('csv-file-input').click());
    document.getElementById('csv-file-input').addEventListener('change', handleCsvFile);
    document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', closeModal));
    document.querySelectorAll('.modal').forEach(modal => modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); }));
}

function setupPoolsPage() {
    // This function exists to prevent initialization errors.
}

function setupSuppliersPage() {
    document.getElementById('add-supplier-btn').addEventListener('click', () => openSupplierModal());
    document.getElementById('add-purchase-btn').addEventListener('click', () => openPurchaseModal());
    document.getElementById('comparative-report-btn').addEventListener('click', () => openComparativeReportModal());
}

function setupUsersPage() {
    document.getElementById('add-user-btn').addEventListener('click', () => openUserModal());
    document.getElementById('add-role-btn').addEventListener('click', () => openRoleModal());
}

function initializeUI() {
    setupDashboard();
    setupTransactionsPage();
    setupPoolsPage();
    setupSuppliersPage();
    setupUsersPage();
      setupTargetsLogic();
    applyPermissions();
    switchPage('dashboard');
    updateDashboardView();
}

// --- REALTIME LISTENERS ---
function setupRealtimeListeners() {
    const appId = firebaseConfig.projectId;
    const transactionsRef = collection(db, `artifacts/${appId}/public/data/transactions`);
    const usersRef = collection(db, `artifacts/${appId}/public/data/users`);
    const rolesRef = collection(db, `artifacts/${appId}/public/data/roles`);
    const suppliersRef = collection(db, `artifacts/${appId}/public/data/suppliers`);

    if (unsubscribeTransactions) unsubscribeTransactions();
    unsubscribeTransactions = onSnapshot(transactionsRef, (snapshot) => {
        ALL_TRANSACTIONS = snapshot.docs.map(doc => {
            const data = doc.data();
            
            let dateObject = null;
            if (data.orderdate && typeof data.orderdate.toDate === 'function') {
                dateObject = data.orderdate.toDate();
            } else if (data.orderdate) {
                dateObject = new Date(data.orderdate);
            }
            if (!dateObject || isNaN(dateObject)) {
                console.error("Invalid date format for transaction ID:", doc.id, data);
                dateObject = new Date();
            }
            
            const processedHistory = (data.editHistory || []).map(entry => {
                if (entry.timestamp && typeof entry.timestamp.toDate === 'function') {
                    return { ...entry, timestamp: entry.timestamp.toDate() };
                }
                return entry;
            });

            return { ...data, id: doc.id, orderdate: dateObject, editHistory: processedHistory };
        });
populateCurrencyFilter(); // <-- این خط جدید است
        
        if (isProcessingPools) {
            console.log("Pool processing is already running, skipping this update.");
            return;
        }
        
        processAllTransactionsForPools().then(() => {
            if(appInitialized) {
                filterAndRenderTransactions();
                updateDashboardView();
                renderPoolsTable();
            }
        });
    });

    if (unsubscribeUsers) unsubscribeUsers();
    unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
        users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (appInitialized) renderUsersTable();
    });

    if (unsubscribeRoles) unsubscribeRoles();
    unsubscribeRoles = onSnapshot(rolesRef, (snapshot) => {
        roles = {};
        snapshot.docs.forEach(doc => { roles[doc.id] = { id: doc.id, ...doc.data() }; });
        if (appInitialized) {
            renderRolesSection();
            applyPermissions();
        }
    });

    if (unsubscribeSuppliers) unsubscribeSuppliers();
    unsubscribeSuppliers = onSnapshot(suppliersRef, (snapshot) => {
        ALL_SUPPLIERS = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (appInitialized) {
            renderSuppliersTable();
            filterAndRenderTransactions(); 
        }
    });
}

// --- DATA PROCESSING ---
async function processAllTransactionsForPools() {
    if (isProcessingPools) return;
    isProcessingPools = true;

    // تابع کمکی برای گرد کردن اعداد مالی به ۴ رقم اعشار
    const roundCurrency = (value) => {
        if (typeof value !== 'number' || isNaN(value)) return 0;
        return Math.round(value * 10000) / 10000;
    };

    try {
        const localTransactions = JSON.parse(JSON.stringify(ALL_TRANSACTIONS));
        const sortedTransactions = localTransactions.sort((a, b) => new Date(a.orderdate) - new Date(b.orderdate));
        
        const updatesBatch = writeBatch(db);
        let updatesNeeded = false;
        
        const fifoPools = {};
        const pendingSalesQueues = {};
        const transactionLogs = {};

        const allCurrencySlugs = [...new Set(sortedTransactions.map(t => t.currencie_slug).filter(Boolean))];
        allCurrencySlugs.forEach(slug => {
            fifoPools[slug] = [];
            pendingSalesQueues[slug] = [];
            transactionLogs[slug] = [];
        });

        for (const t of sortedTransactions) {
            const slug = t.currencie_slug;
            if (!slug) continue;

            const currentPool = fifoPools[slug];
            const currentQueue = pendingSalesQueues[slug];
            const currentLog = transactionLogs[slug];

            if (t.services_type === 'buy') {
                currentQueue.push(t);
            } else {
                currentPool.push({ qty: t.currency_amount, cost: t.currency_price });
                currentLog.push({ date: t.orderdate, amount: t.currency_amount, orderid: t.orderid, type: 'واریز', rate: t.currency_price });
                if (t.NetProfit !== 0 || t.costBasisStatus !== 'settled') {
                    updatesBatch.update(doc(db, `artifacts/${firebaseConfig.projectId}/public/data/transactions`, t.id), { NetProfit: 0, costBasisStatus: 'settled', Cost_Basis: t.currency_price });
                    updatesNeeded = true;
                }
            }

            let queueChanged = true;
            while(queueChanged && currentQueue.length > 0) {
                queueChanged = false;
                const availableQty = currentPool.reduce((sum, layer) => sum + layer.qty, 0);
                const fulfillableOrderIndex = currentQueue.findIndex(sale => availableQty >= sale.currency_amount);

                if (fulfillableOrderIndex > -1) {
                    const nextSale = currentQueue.splice(fulfillableOrderIndex, 1)[0];
                    let saleAmount = nextSale.currency_amount;
                    let totalCostForThisSale = 0;
                    for (const layer of currentPool) {
                        if (saleAmount <= 0) break;
                        const amountFromThisLayer = Math.min(saleAmount, layer.qty);
                        totalCostForThisSale += amountFromThisLayer * layer.cost;
                        layer.qty -= amountFromThisLayer;
                        saleAmount -= amountFromThisLayer;
                    }
                    while (currentPool.length > 0 && currentPool[0].qty <= 0) {
                        currentPool.shift();
                    }

                    // گرد کردن مقادیر محاسبه شده
                    const newCostBasis = roundCurrency(nextSale.currency_amount > 0 ? totalCostForThisSale / nextSale.currency_amount : 0);
                    const actualNetworkWageToman = (nextSale['ActualNetwork Wage'] || 0) * nextSale.currency_price;
                    const newNetProfit = roundCurrency(nextSale.Total_Amount - (totalCostForThisSale + actualNetworkWageToman));

                    currentLog.push({ date: nextSale.orderdate, amount: nextSale.currency_amount, orderid: nextSale.orderid, type: 'برداشت', rate: newCostBasis });
                    
                    // مقایسه مقادیر گرد شده برای جلوگیری از آپدیت غیر ضروری
                    if (roundCurrency(nextSale.Cost_Basis) !== newCostBasis || roundCurrency(nextSale.NetProfit) !== newNetProfit || nextSale.costBasisStatus !== 'settled') {
                        updatesBatch.update(doc(db, `artifacts/${firebaseConfig.projectId}/public/data/transactions`, nextSale.id), { 
                            costBasisStatus: 'settled', 
                            Cost_Basis: newCostBasis, 
                            NetProfit: newNetProfit 
                        });
                        updatesNeeded = true;
                    }
                    queueChanged = true;
                }
            }
        }

        for(const slug of allCurrencySlugs) {
            for(const remainingSale of pendingSalesQueues[slug]) {
                if (remainingSale.costBasisStatus !== 'pending') {
                    updatesBatch.update(doc(db, `artifacts/${firebaseConfig.projectId}/public/data/transactions`, remainingSale.id), { costBasisStatus: 'pending', Cost_Basis: 0, NetProfit: 0 });
                    updatesNeeded = true;
                }
            }
        }
        
        currencyPools = {};
        for(const slug of allCurrencySlugs) {
            const finalPool = fifoPools[slug];
            const finalPoolQty = roundCurrency(finalPool.reduce((sum, layer) => sum + layer.qty, 0));
            const finalPoolValue = finalPool.reduce((sum, layer) => sum + (layer.qty * layer.cost), 0);
            const finalAvgCost = finalPoolQty > 0 ? roundCurrency(finalPoolValue / finalPoolQty) : 0;
            currencyPools[slug] = { 
                quantity: finalPoolQty, 
                weightedAvgCost: finalAvgCost, 
                log: transactionLogs[slug] 
            };
        }

        if (updatesNeeded) {
            console.log("Committing final batch updates to break loop...");
            await updatesBatch.commit();
        }
    } catch (error) {
        console.error("Error in processAllTransactionsForPools:", error);
    } finally {
        isProcessingPools = false;
    }
}

// --- UI & PAGE LOGIC ---
let salesProfitChart, profitCompositionChart;
let orderCountChart, assetCompositionChart;
let currentPage = 1;
const ROWS_PER_PAGE = 15;
let filteredTransactions = [];

const formatCurrency = (value, decimals = 2) => {
    if (typeof value !== 'number') { value = parseFloat(value); }
    if (isNaN(value)) { return '0'; }
    return new Intl.NumberFormat('fa-IR').format(value.toFixed(decimals));
};
const formatDate = (date) => {
    if (!(date instanceof Date) || isNaN(date)) return "تاریخ نامعتبر";
    return date.toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
const formatDateTime = (date) => {
    if (!(date instanceof Date) || isNaN(date)) return "تاریخ نامعتبر";
    return date.toLocaleString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

let updateDashboardView = () => {};

const navLinks = document.querySelectorAll('.nav-link');
const pageContents = document.querySelectorAll('.page-content');
function switchPage(pageId) {
    navLinks.forEach(link => link.classList.remove('active'));
    pageContents.forEach(page => page.classList.remove('active'));
    document.getElementById(`nav-${pageId}`).classList.add('active');
    document.getElementById(`page-${pageId}`).classList.add('active');
    if (pageId === 'pools') renderPoolsTable();
    if (pageId === 'suppliers') renderSuppliersTable();
    if (pageId === 'users') { renderUsersTable(); renderRolesSection(); }
}
navLinks.forEach(link => link.addEventListener('click', (e) => {
    e.preventDefault();
    switchPage(e.currentTarget.id.replace('nav-', ''));
}));

// --- TRANSACTIONS PAGE FUNCTIONS ---
function populateCurrencyFilter() {
    const currencyFilter = document.getElementById('tx-currency-filter');
    if (!currencyFilter) return;
    const selectedValue = currencyFilter.value;
    const uniqueCurrencies = [...new Set(ALL_TRANSACTIONS.map(t => t.currencie_slug))].filter(Boolean).sort();
    currencyFilter.innerHTML = '<option value="">همه ارزها</option>';
    uniqueCurrencies.forEach(slug => {
        currencyFilter.innerHTML += `<option value="${slug}">${slug.toUpperCase()}</option>`;
    });
    currencyFilter.value = selectedValue;
}
function getFilteredData() {
    const searchTerm = document.getElementById('tx-search-input').value.toLowerCase();
    const startDateEl = document.getElementById('tx-start-date');
    const endDateEl = document.getElementById('tx-end-date');
    let startDateUnix = 0;
    const startDatePicker = $(startDateEl).data('datepicker');
    if (startDateEl.value && startDatePicker && startDatePicker.getState().selected) {
        startDateUnix = startDatePicker.getState().selected.unixDate;
    }
    let endDateUnix = Infinity;
    const endDatePicker = $(endDateEl).data('datepicker');
    if (endDateEl.value && endDatePicker && endDatePicker.getState().selected) {
        endDateUnix = endDatePicker.getState().selected.unixDate + 86400000;
    }
    const type = document.getElementById('tx-type-filter').value;
    const currency = document.getElementById('tx-currency-filter').value;

    return ALL_TRANSACTIONS.filter(t => {
        const typeMatch = type === '' || t.services_type === type;
        const date = new Date(t.orderdate).getTime();
        const dateMatch = date >= startDateUnix && date < endDateUnix;
        const currencyMatch = currency === '' || t.currencie_slug === currency;

        let searchMatch = searchTerm === '';
        if (!searchMatch) {
            const searchableString = Object.values(t).join(' ').toLowerCase();
            searchMatch = searchableString.includes(searchTerm);
        }

        return searchMatch && typeMatch && dateMatch && currencyMatch;
    });
}

function filterAndRenderTransactions() {
    if(!appInitialized) return;
    filteredTransactions = getFilteredData().sort((a, b) => new Date(b.orderdate) - new Date(a.orderdate));
    renderTransactionsTable();
    renderPagination();
}

function renderTransactionsTable() {
    const tableBody = document.getElementById('transactions-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    const paginatedItems = filteredTransactions.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);
    if (paginatedItems.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-8">تراکنشی یافت نشد.</td></tr>`;
        return;
    }
    paginatedItems.forEach(t => {
        const isPending = t.costBasisStatus === 'pending';
        const profitColor = isPending ? 'text-amber-400' : (t.NetProfit >= 0 ? 'text-green-400' : 'text-red-400');
        const profitText = isPending ? '<span class="text-xs">در انتظار تسویه</span>' : formatCurrency(t.NetProfit, 0);

        const row = document.createElement('tr');
        row.className = 'border-b border-slate-700/50 hover:bg-slate-800/40';
        
        let userOrSupplierName = `${t.first_name || ''} ${t.last_name || ''}`;
        let userOrSupplierDetails = t.Mobile || '';
        let typeLabel = t.services_type === 'buy' ? 'فروش به مشتری' : 'خرید از مشتری';
        let typeColorClass = t.services_type === 'buy' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300';
        
        if (t.transaction_source === 'supplier') {
            const supplier = ALL_SUPPLIERS.find(s => s.id === t.supplierId);
            userOrSupplierName = supplier ? supplier.name : 'تامین‌کننده حذف شده';
            userOrSupplierDetails = `<span class="text-xs text-fuchsia-400 font-sans">تامین</span>`;
            typeLabel = 'خرید از تامین‌کننده';
            typeColorClass = 'bg-sky-500/20 text-sky-300';
        }

        row.innerHTML = `
            <td class="px-4 py-4 font-mono text-xs text-slate-300">${String(t.orderid).includes('-') ? String(t.orderid).split('-')[1] : t.orderid}</td>
            <td class="px-4 py-4 whitespace-nowrap">${formatDate(new Date(t.orderdate))}</td>
            <td class="px-4 py-4"><div>${userOrSupplierName}</div><div class="text-xs text-slate-500">${userOrSupplierDetails}</div></td>
            <td class="px-4 py-4"><span class="px-2 py-1 rounded-full text-xs ${typeColorClass}">${typeLabel}</span></td>
            <td class="px-4 py-4 font-semibold text-white">${t.currencie_slug}</td>
            <td class="px-4 py-4 font-mono">${formatCurrency(t.currency_amount, 6)}</td>
            <td class="px-4 py-4 font-mono text-white">${formatCurrency(t.Total_Amount,0)}</td>
            <td class="px-4 py-4 font-mono ${profitColor}">${profitText}</td>
            <td class="px-4 py-4 flex items-center gap-2">
                <button class="details-btn text-slate-400 hover:text-cyan-400" title="جزئیات"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
                <button class="edit-btn text-slate-400 hover:text-amber-400" title="اصلاح"><svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" /></svg></button>
                ${t.editHistory && t.editHistory.length > 0 ? `<button class="history-btn text-slate-400 hover:text-fuchsia-400" title="تاریخچه تغییرات"><svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clip-rule="evenodd" /></svg></button>` : ''}
            </td>
        `;
        row.querySelector('.details-btn').addEventListener('click', () => showDetailsModal(t));
        row.querySelector('.edit-btn').addEventListener('click', () => openTransactionModal(t));
        if(t.editHistory && t.editHistory.length > 0) {
            row.querySelector('.history-btn').addEventListener('click', () => showHistoryModal(t));
        }
        tableBody.appendChild(row);
    });
}

function renderPagination() {
    const paginationEl = document.getElementById('tx-pagination');
    if (!paginationEl) return;
    const totalPages = Math.ceil(filteredTransactions.length / ROWS_PER_PAGE);
    paginationEl.innerHTML = `<span class="text-sm text-slate-400">نمایش ${filteredTransactions.length > 0 ? (currentPage - 1) * ROWS_PER_PAGE + 1 : 0} تا ${Math.min(currentPage * ROWS_PER_PAGE, filteredTransactions.length)} از ${filteredTransactions.length} نتیجه</span>`;
    if (totalPages > 1) {
        let buttons = `<div class="flex items-center gap-2">`;
        buttons += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="window.changePage(${currentPage - 1})" class="px-3 py-1 bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed">قبلی</button>`;
        buttons += `<span class="px-3 py-1">${currentPage} / ${totalPages}</span>`;
        buttons += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="window.changePage(${currentPage + 1})" class="px-3 py-1 bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed">بعدی</button>`;
        buttons += `</div>`;
        paginationEl.innerHTML += buttons;
    }
}
window.changePage = (page) => { currentPage = page; renderTransactionsTable(); renderPagination(); }

function exportToCSV() {
    const dataToExport = getFilteredData();
    const headers = [ "orderid", "orderdate", "userid", "first_name", "last_name", "Mobile", "Email", "service_slug", "categories_title", "services_type", "currency", "currencie_slug", "Source Wallet Address", "Destination Wallet Address", "Txid", "currency_amount", "Is Crypto?", "crypto_total_usdt", "currency_price", "Cost_Basis", "Network Wage", "ActualNetwork Wage", "Fix Wage", "Total Amount", "Vip Amount", "Voucher Amount", "Vouchers Code", "description", "NetProfit", "costBasisStatus" ];
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += headers.join(",") + "\r\n";
    dataToExport.forEach(row => {
        const rowData = headers.map(header => {
            let cell = row[header] === null || row[header] === undefined ? '' : row[header];
            if (typeof cell === 'string' && cell.includes(',')) { cell = `"${cell}"`; }
            if(header === 'orderdate') { cell = new persianDate(new Date(row[header])).format('YYYY/MM/DD HH:mm:ss'); }
            return cell;
        });
        csvContent += rowData.join(",") + "\r\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transactions_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- MODAL FUNCTIONS ---
const detailsModal = document.getElementById('details-modal');
const transactionFormModal = document.getElementById('transaction-form-modal');
function closeModal() {
    detailsModal.classList.add('hidden');
    transactionFormModal.classList.add('hidden');
}

function showModalMessage(title, bodyHtml) {
    const modalTitle = document.getElementById('details-modal-title');
    const modalBody = document.getElementById('details-modal-body');
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    detailsModal.classList.remove('hidden');
}

function showPendingTransactionsModal() {
    const pendingTxs = ALL_TRANSACTIONS
        .filter(t => t.costBasisStatus === 'pending')
        .sort((a, b) => new Date(a.orderdate) - new Date(b.orderdate));

    let tableHtml = `<div class="table-container overflow-y-auto max-h-[60vh]"><table class="w-full text-sm text-right text-slate-400"><thead class="text-xs text-slate-300 uppercase bg-slate-800/60 sticky top-0"><tr><th class="px-4 py-2">تاریخ</th><th class="px-4 py-2">کاربر</th><th class="px-4 py-2">ارز</th><th class="px-4 py-2">مقدار</th></tr></thead><tbody>`;

    if (pendingTxs.length === 0) {
        tableHtml += `<tr><td colspan="4" class="text-center py-8">هیچ تراکنش در انتظاری وجود ندارد.</td></tr>`;
    } else {
        pendingTxs.forEach(t => {
            tableHtml += `<tr class="border-b border-slate-700/50">
                <td class="px-4 py-3 whitespace-nowrap">${formatDateTime(new Date(t.orderdate))}</td>
                <td class="px-4 py-3">${t.first_name || ''} ${t.last_name || ''}</td>
                <td class="px-4 py-3 font-semibold text-white">${t.currencie_slug}</td>
                <td class="px-4 py-3 font-mono">${formatCurrency(t.currency_amount, 6)}</td>
            </tr>`;
        });
    }
    tableHtml += '</tbody></table></div>';
    showModalMessage('تراکنش‌های در انتظار تسویه', tableHtml);
}

function showDetailsModal(t) {
    const detailItem = (label, value, extraClass = '') => `<div class="py-2.5 grid grid-cols-3 gap-4 border-b border-slate-700/30"><dt class="text-sm text-slate-400">${label}</dt><dd class="col-span-2 text-sm text-white font-mono break-words ${extraClass}">${value}</dd></div>`;
    
    // استفاده از براکت برای خواندن پراپرتی‌هایی که اسمشان فاصله دارد
    const networkWageCrypto = t['Network Wage'] || 0;
    const actualNetworkWageCrypto = t['ActualNetwork Wage'] || 0;
    const fixWage = t['Fix Wage'] || 0;
    const vipAmount = t['Vip Amount'] || 0;
    const voucherAmount = t['Voucher Amount'] || 0;
    const vouchersCode = t['Vouchers Code'] || '---';
    const cryptoTotalUsdt = t.crypto_total_usdt || 0;

    const price = t.currency_price || 0;
    const slug = (t.currencie_slug || '').toUpperCase();

    const networkWageToman = networkWageCrypto * price;
    const actualNetworkWageToman = actualNetworkWageCrypto * price;

    const networkWageDisplay = `${formatCurrency(networkWageCrypto, 6)} ${slug} <span class="text-slate-400 font-sans">(${formatCurrency(networkWageToman, 0)} تومان)</span>`;
    const actualNetworkWageDisplay = `${formatCurrency(actualNetworkWageCrypto, 6)} ${slug} <span class="text-slate-400 font-sans">(${formatCurrency(actualNetworkWageToman, 0)} تومان)</span>`;
    
    const usdtEquivalentDisplay = typeof t.usdt_equivalent_at_creation === 'number' && t.usdt_equivalent_at_creation > 0
        ? `${formatCurrency(t.usdt_equivalent_at_creation, 2)} USDT`
        : 'محاسبه نشده';

    let userInfoHtml = '';
    if (t.transaction_source === 'supplier') {
        const supplier = ALL_SUPPLIERS.find(s => s.id === t.supplierId);
        const supplierName = supplier ? supplier.name : 'تامین‌کننده حذف شده';
        userInfoHtml = `<h4 class="text-lg font-semibold text-cyan-400 mb-2">اطلاعات تامین‌کننده</h4><dl>${detailItem('نام تامین‌کننده', `<span class="font-sans">${supplierName}</span>`)}</dl>`;
    } else {
        userInfoHtml = `<h4 class="text-lg font-semibold text-cyan-400 mb-2">اطلاعات کاربر</h4><dl>${detailItem('ID کاربر', t.userid || '---')}${detailItem('نام', `<span class="font-sans">${t.first_name || ''}</span>`)}${detailItem('نام خانوادگی', `<span class="font-sans">${t.last_name || ''}</span>`)}${detailItem('موبایل', t.Mobile || '---')}${detailItem('ایمیل', t.Email || '---')}</dl>`;
    }

    const bodyHtml = `<div class="grid grid-cols-1 md:grid-cols-2 gap-x-8"><div><h4 class="text-lg font-semibold text-cyan-400 mb-2">اطلاعات سفارش</h4><dl>${detailItem('ID سفارش', t.orderid)}${detailItem('تاریخ سفارش', new Date(t.orderdate).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' }))}${detailItem('اسلاگ سرویس', t.service_slug || '---')}${detailItem('عنوان دسته', t.categories_title || '---')}${detailItem('نوع سرویس', t.services_type === 'buy' ? 'فروش به مشتری' : 'خرید از مشتری')}${detailItem('کریپتو؟', t['Is Crypto?'] ? 'بله' : 'خیر')}${detailItem('کد تخفیف', vouchersCode)}${detailItem('توضیحات', `<p class="text-xs leading-relaxed font-sans">${t.description || '---'}</p>`)}</dl></div><div>${userInfoHtml}<h4 class="text-lg font-semibold text-cyan-400 mt-6 mb-2">آدرس‌ها و TXID</h4><dl>${detailItem('آدرس مبدا', t['Source Wallet Address'] || '---')}${detailItem('آدرس مقصد', t['Destination Wallet Address'] || '---')}${detailItem('TXID', t.Txid || '---')}</dl></div></div><div class="mt-6"><h4 class="text-lg font-semibold text-cyan-400 mb-2">جزئیات مالی</h4><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><div class="glass-card p-4 rounded-lg">${detailItem('نام ارز', `<span class="font-sans">${t.currency}</span> (${t.currencie_slug})`)}</div><div class="glass-card p-4 rounded-lg">${detailItem('مقدار ارز', formatCurrency(t.currency_amount, 8))}</div><div class="glass-card p-4 rounded-lg">${detailItem('نرخ ارز', formatCurrency(t.currency_price,0))}</div><div class="glass-card p-4 rounded-lg">${detailItem('ارزش تومانی', formatCurrency(cryptoTotalUsdt,0))}</div><div class="glass-card p-4 rounded-lg">${detailItem('معادل تتری (نرخ استخر در زمان ثبت)', usdtEquivalentDisplay)}</div><div class="glass-card p-4 rounded-lg">${detailItem('کارمزد ثابت', formatCurrency(fixWage,0))}</div><div class="glass-card p-4 rounded-lg">${detailItem('کارمزد VIP', formatCurrency(vipAmount,0))}</div><div class="glass-card p-4 rounded-lg">${detailItem('مبلغ ووچر', formatCurrency(voucherAmount,0))}</div><div class="glass-card p-4 rounded-lg">${detailItem('کارمزد شبکه (دریافتی)', networkWageDisplay)}</div><div class="glass-card p-4 rounded-lg">${detailItem('کارمزد شبکه (واقعی)', actualNetworkWageDisplay)}</div><div class="glass-card p-4 rounded-lg bg-slate-900/50">${detailItem('قیمت تمام شده (فی واحد)', formatCurrency(t.Cost_Basis,0), 'text-amber-400')}</div><div class="glass-card p-4 rounded-lg bg-slate-900/50">${detailItem('مبلغ کل', formatCurrency(t.Total_Amount,0), 'text-cyan-400 font-bold')}</div><div class="glass-card p-4 rounded-lg bg-slate-900/50">${detailItem('سود/زیان خالص', formatCurrency(t.NetProfit,0), t.NetProfit >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold')}</div></div></div>`;
    showModalMessage('جزئیات کامل تراکنش', bodyHtml);
}

function showHistoryModal(t) {
    let historyHtml = '<div class="space-y-4">';
    t.editHistory.forEach((entry, index) => {
        const historyDate = entry.timestamp ? new Date(entry.timestamp).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' }) : 'تاریخ نامشخص';
        historyHtml += `<div class="glass-card p-4 rounded-lg"><p class="text-sm text-slate-400 mb-2">تغییر شماره ${index + 1} در تاریخ ${historyDate}</p><p class="text-white mb-3"><span class="text-slate-400">توضیحات:</span> ${entry.reason}</p><div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs"><div class="text-slate-300"><span class="text-slate-500">فیلد</span></div><div class="text-red-400"><span class="text-slate-500">مقدار قبلی</span></div><div class="text-green-400"><span class="text-slate-500">مقدار جدید</span></div>${Object.keys(entry.changes).map(key => `<div class="font-mono">${key}</div><div class="font-mono text-red-400">${formatCurrency(entry.changes[key].old, 4)}</div><div class="font-mono text-green-400">${formatCurrency(entry.changes[key].new, 4)}</div>`).join('')}</div></div>`;
    });
    historyHtml += '</div>';
    showModalMessage(`تاریخچه تغییرات - ${String(t.orderid).includes('-') ? String(t.orderid).split('-')[1] : t.orderid}`, historyHtml);
}

async function openTransactionModal(transaction = null) {
    const form = document.getElementById('transaction-form');
    const title = document.getElementById('transaction-form-title');
    const isEdit = transaction !== null;
    title.textContent = isEdit ? `اصلاح تراکنش ${String(transaction.orderid).includes('-') ? String(transaction.orderid).split('-')[1] : transaction.orderid}` : 'افزودن تراکنش دستی';
    
    const allFields = [
        {id: 'orderid', label: 'ID سفارش', type: 'number'},
        {id: 'orderdate', label: 'تاریخ و زمان', type: 'text'}, 
        {id: 'userid', label: 'ID کاربر', type: 'number'}, 
        {id: 'first_name', label: 'نام', type: 'text'}, 
        {id: 'last_name', label: 'نام خانوادگی', type: 'text'}, 
        {id: 'Mobile', label: 'موبایل', type: 'text'}, 
        {id: 'Email', label: 'ایمیل', type: 'text'}, 
        {id: 'service_slug', label: 'اسلاگ سرویس', type: 'text'}, 
        {id: 'categories_title', label: 'عنوان دسته', type: 'text'}, 
        {id: 'services_type', label: 'نوع سرویس', type: 'select', options: ['buy', 'sell']}, 
        {id: 'currency', label: 'نام ارز', type: 'text'}, 
        {id: 'currencie_slug', label: 'اسلاگ ارز', type: 'text'}, 
        {id: 'Source Wallet Address', label: 'آدرس مبدا', type: 'text'}, 
        {id: 'Destination Wallet Address', label: 'آدرس مقصد', type: 'text'}, 
        {id: 'Txid', label: 'Txid', type: 'text'}, 
        {id: 'currency_amount', label: 'مقدار ارز', type: 'number', step: '0.00000001', isFinancial: true}, 
        {id: 'currency_price', label: 'نرخ ارز (تومان)', type: 'number', step: '0.01', isFinancial: true}, 
        {id: 'Network_Wage', label: 'کارمزد شبکه (دریافتی) (واحد ارز)', type: 'number', step: '0.00000001', isFinancial: true}, 
        {id: 'ActualNetwork_Wage', label: 'کارمزد شبکه (واقعی) (واحد ارز)', type: 'number', step: '0.00000001', isFinancial: true}, 
        {id: 'Fix_Wage', label: 'کارمزد ثابت (تومان)', type: 'number', step: '0.01', isFinancial: true}, 
        {id: 'Vip_Amount', label: 'مبلغ VIP (تومان)', type: 'number', step: '0.01', isFinancial: true}, 
        {id: 'Voucher_Amount', label: 'مبلغ ووچر (تومان)', type: 'number', step: '0.01', isFinancial: true}, 
        {id: 'Vouchers Code', label: 'کد ووچر', type: 'text'}, 
        {id: 'description', label: 'توضیحات', type: 'textarea'},
    ];

    let formHtml = `<input type="hidden" name="id" value="${isEdit ? transaction.id : ''}"><div class="grid grid-cols-1 md:grid-cols-3 gap-4">`;
    allFields.forEach(field => {
        let value = isEdit ? transaction[field.id] : '';
        if (isEdit && field.id === 'orderdate') { value = new Date(transaction.orderdate).toISOString().slice(0, 16); }
        const disabled = isEdit && !field.isFinancial ? 'disabled' : '';
        const disabledClass = isEdit && !field.isFinancial ? 'bg-slate-700/50 cursor-not-allowed' : 'bg-slate-800/50';
        const fieldHtml = (type) => `<${type} name="${field.id}" id="form-${field.id}" ${type === 'textarea' ? '' : `value="${value}"`} ${disabled} ${field.step ? `step="${field.step}"` : ''} class="border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 ${disabledClass}" ${type === 'textarea' ? 'rows="3"' : ''}>${type === 'textarea' ? value : ''}`;
        formHtml += '<div>';
        formHtml += `<label for="form-${field.id}" class="block mb-2 text-sm font-medium text-slate-400">${field.label}</label>`;
        if (field.id === 'orderdate') {
            formHtml += `<input type="datetime-local" name="orderdate" id="form-orderdate" value="${value}" class="border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 ${disabledClass}" ${disabled}>`;
        } else if (field.type === 'select') {
            formHtml += `<select name="${field.id}" id="form-${field.id}" class="border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 ${disabledClass}" ${disabled}>`;
            formHtml += `<option value="buy" ${value === 'buy' ? 'selected' : ''}>فروش به مشتری</option>`;
            formHtml += `<option value="sell" ${value === 'sell' ? 'selected' : ''}>خرید از مشتری</option>`;
            formHtml += '</select>';
        } else if (field.type === 'textarea') {
            formHtml += `${fieldHtml('textarea')}</textarea>`;
        } else {
            formHtml += `${fieldHtml('input')}`;
        }
        formHtml += '</div>';
    });
    if (isEdit) {
        formHtml += `<div class="md:col-span-3"><label for="edit_reason" class="block mb-2 text-sm font-medium text-slate-400">توضیحات اصلاحیه (اجباری)</label><textarea id="edit_reason" name="edit_reason" required class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5" rows="3"></textarea></div>`;
    }
    formHtml += `</div><button type="submit" class="w-full mt-6 text-white bg-cyan-600 hover:bg-cyan-700 focus:ring-4 focus:outline-none focus:ring-cyan-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center">${isEdit ? 'ذخیره تغییرات' : 'ثبت تراکنش'}</button>`;
    form.innerHTML = formHtml;
    form.onsubmit = handleTransactionSubmit;
    transactionFormModal.classList.remove('hidden');
}

async function handleTransactionSubmit(e) {
    e.preventDefault();
    const appId = firebaseConfig.projectId;
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const txId = data.id;

    try {
        if (txId) { // --- EDIT MODE ---
            const txRef = doc(db, `artifacts/${appId}/public/data/transactions`, txId);
            const originalTxDoc = await getDoc(txRef);
            const originalTxData = originalTxDoc.data();

            const updatedTxData = { ...originalTxData };

            Object.keys(data).forEach(key => {
                if (key === 'id' || key === 'edit_reason' || data[key] === undefined || data[key] === '') return;
                const value = data[key];
                if (!isNaN(parseFloat(value))) {
                    updatedTxData[key] = parseFloat(value);
                } else {
                    updatedTxData[key] = value;
                }
            });

            const networkWageToman = (updatedTxData.Network_Wage || 0) * updatedTxData.currency_price;
            const actualNetworkWageToman = (updatedTxData.ActualNetwork_Wage || 0) * updatedTxData.currency_price;
            updatedTxData.crypto_total_usdt = updatedTxData.currency_amount * updatedTxData.currency_price;

            if (updatedTxData.services_type === 'sell') {
                updatedTxData.Total_Amount = (updatedTxData.currency_amount * updatedTxData.currency_price) - (updatedTxData.Fix_Wage || 0) - (updatedTxData.Vip_Amount || 0) - networkWageToman + (updatedTxData.Voucher_Amount || 0);
                updatedTxData.NetProfit = (updatedTxData.Fix_Wage || 0) + (updatedTxData.Vip_Amount || 0) + (networkWageToman - actualNetworkWageToman);
            } else {
                updatedTxData.Total_Amount = (updatedTxData.currency_amount * updatedTxData.currency_price) + (updatedTxData.Vip_Amount || 0) + (updatedTxData.Fix_Wage || 0) + networkWageToman - (updatedTxData.Voucher_Amount || 0);
                if (updatedTxData.costBasisStatus !== 'pending') {
                   updatedTxData.NetProfit = updatedTxData.Total_Amount - ((updatedTxData.Cost_Basis * updatedTxData.currency_amount) + actualNetworkWageToman);
                } else {
                   updatedTxData.NetProfit = 0; // Keep profit 0 for pending
                }
            }
            
            const changes = {};
            Object.keys(updatedTxData).forEach(key => {
                if (originalTxData[key] !== updatedTxData[key]) {
                     changes[key] = { old: originalTxData[key] || null, new: updatedTxData[key] };
                }
            });
            delete changes.editHistory;

            const editHistoryEntry = { timestamp: Timestamp.now(), reason: data.edit_reason, changes: changes, editorId: currentUser.uid };
            const currentHistory = originalTxData.editHistory ? originalTxData.editHistory.map(h => ({...h, timestamp: Timestamp.fromDate(new Date(h.timestamp))})) : [];
            updatedTxData.editHistory = [...currentHistory, editHistoryEntry];
            
            await updateDoc(txRef, updatedTxData);

        } else { // --- ADD MODE ---
            const newTxData = {};
            Object.keys(data).forEach(key => {
                if (key === 'id' || key === 'edit_reason') return;
                const value = data[key];
                if (key === 'orderdate') {
                    newTxData[key] = Timestamp.fromDate(new Date(value));
                } else if (value !== '' && !isNaN(parseFloat(value)) && !key.includes('Address') && !key.includes('id') && key !== 'Mobile' && key !== 'Vouchers Code') {
                    newTxData[key] = parseFloat(value);
                } else {
                    newTxData[key] = value;
                }
            });
            newTxData['Is Crypto?'] = true;

            const pool = currencyPools[newTxData.currencie_slug] || { quantity: 0, weightedAvgCost: 0 };
            
            if (newTxData.services_type === 'buy' && pool.quantity < newTxData.currency_amount) {
                newTxData.costBasisStatus = 'pending';
                newTxData.Cost_Basis = 0;
                newTxData.NetProfit = 0; // Profit is unknown
            } else {
                newTxData.costBasisStatus = 'settled';
                newTxData.Cost_Basis = newTxData.services_type === 'sell' ? newTxData.currency_price : (pool.weightedAvgCost > 0 ? pool.weightedAvgCost : newTxData.currency_price * 0.98);
            }
            
            const networkWageToman = (newTxData.Network_Wage || 0) * newTxData.currency_price;
            const actualNetworkWageToman = (newTxData.ActualNetwork_Wage || 0) * newTxData.currency_price;
            newTxData.crypto_total_usdt = newTxData.currency_amount * newTxData.currency_price;

            if (newTxData.services_type === 'sell') {
                newTxData.Total_Amount = (newTxData.currency_amount * newTxData.currency_price) - (newTxData.Fix_Wage || 0) - (newTxData.Vip_Amount || 0) - networkWageToman + (newTxData.Voucher_Amount || 0);
                newTxData.NetProfit = (newTxData.Fix_Wage || 0) + (newTxData.Vip_Amount || 0) + (networkWageToman - actualNetworkWageToman);
            } else {
                newTxData.Total_Amount = (newTxData.currency_amount * newTxData.currency_price) + (newTxData.Vip_Amount || 0) + (newTxData.Fix_Wage || 0) + networkWageToman - (newTxData.Voucher_Amount || 0);
                if (newTxData.costBasisStatus === 'settled') {
                   newTxData.NetProfit = newTxData.Total_Amount - ((newTxData.Cost_Basis * newTxData.currency_amount) + actualNetworkWageToman);
                }
            }
            
            const usdtPoolCost = currencyPools['tether']?.weightedAvgCost || 0;
            if (usdtPoolCost > 0) {
                newTxData.usdt_equivalent_at_creation = newTxData.crypto_total_usdt / usdtPoolCost;
            } else {
                newTxData.usdt_equivalent_at_creation = 0;
            }

            newTxData.editHistory = [];
            newTxData.createdAt = serverTimestamp();
            newTxData.creatorId = currentUser.uid;
            await addDoc(collection(db, `artifacts/${appId}/public/data/transactions`), newTxData);
        }
        closeModal();
    } catch (error) {
        console.error("Error saving transaction:", error);
        showModalMessage('خطا', `<p class="text-lg text-center text-red-400">${error.message}</p>`);
    }
}

// --- POOLS PAGE FUNCTIONS ---
function renderPoolsTable() {
    const tableBody = document.getElementById('pools-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    Object.keys(currencyPools).sort().forEach(slug => {
        const pool = currencyPools[slug];
        const row = document.createElement('tr');
        row.className = 'border-b border-slate-700/50';
        row.innerHTML = `<td class="px-6 py-4 font-semibold text-white">${slug}</td><td class="px-6 py-4 font-mono">${formatCurrency(pool.quantity, 8)}</td><td class="px-6 py-4 font-mono text-amber-400">${formatCurrency(pool.weightedAvgCost, 2)}</td><td class="px-6 py-4"><button class="pool-log-btn bg-cyan-500/20 text-cyan-300 text-xs px-3 py-1 rounded-md hover:bg-cyan-500/40" data-slug="${slug}">مشاهده لاگ</button></td>`;
        row.querySelector('.pool-log-btn').addEventListener('click', (e) => showPoolLogModal(e.currentTarget.dataset.slug));
        tableBody.appendChild(row);
    });
}

function showPoolLogModal(slug) {
    const pool = currencyPools[slug];
    let logHtml = `<div class="table-container overflow-y-auto max-h-[60vh]"><table class="w-full text-sm text-right text-slate-400"><thead class="text-xs text-slate-300 uppercase bg-slate-800/60 sticky top-0"><tr><th class="px-4 py-2">تاریخ</th><th class="px-4 py-2">نوع</th><th class="px-4 py-2">مقدار</th><th class="px-4 py-2">نرخ (تومان)</th><th class="px-4 py-2">ID سفارش</th></tr></thead><tbody>`;
    [...pool.log].reverse().forEach(entry => {
        const typeClass = entry.type === 'واریز' ? 'text-green-400' : 'text-red-400';
        logHtml += `<tr class="border-b border-slate-700/50"><td class="px-4 py-3 whitespace-nowrap">${new Date(entry.date).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</td><td class="px-4 py-3 ${typeClass}">${entry.type}</td><td class="px-4 py-3 font-mono">${formatCurrency(entry.amount, 6)}</td><td class="px-4 py-3 font-mono">${formatCurrency(entry.rate, 2)}</td><td class="px-4 py-3 font-mono text-xs">${String(entry.orderid).includes('-') ? String(entry.orderid).split('-')[1] : entry.orderid}</td></tr>`;
    });
    logHtml += '</tbody></table></div>';
    showModalMessage(`لاگ واریز و برداشت استخر ${slug}`, logHtml);
}

// --- SUPPLIERS PAGE FUNCTIONS ---
function renderSuppliersTable() {
    const tableBody = document.getElementById('suppliers-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    if (ALL_SUPPLIERS.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-8">تامین‌کننده‌ای یافت نشد.</td></tr>`;
        return;
    }
    ALL_SUPPLIERS.forEach(s => {
        const row = document.createElement('tr');
        row.className = 'border-b border-slate-700/50 hover:bg-slate-800/40';
        row.innerHTML = `
            <td class="px-6 py-4 font-semibold text-white">${s.name || '---'}</td>
            <td class="px-6 py-4">${s.contactPerson || '---'}</td>
            <td class="px-6 py-4 font-mono">${s.mobile || '---'}</td>
            <td class="px-6 py-4 font-mono">${s.email || '---'}</td>
            <td class="px-6 py-4 flex items-center gap-4">
                <button class="supplier-history-btn text-slate-400 hover:text-cyan-400" title="تاریخچه خرید"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg></button>
                <button class="edit-supplier-btn text-slate-400 hover:text-amber-400" title="ویرایش"><svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" /></svg></button>
                <button class="delete-supplier-btn text-slate-400 hover:text-red-400" title="حذف"><svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25-.56-1.25 1.25V4.075c.827-.05 1.66-.075 2.5-.075zM8.47 5.47a.75.75 0 011.06 0L12 7.94l2.47-2.47a.75.75 0 111.06 1.06L13.06 9l2.47 2.47a.75.75 0 11-1.06 1.06L12 10.06l-2.47 2.47a.75.75 0 01-1.06-1.06L10.94 9 8.47 6.53a.75.75 0 010-1.06z" clip-rule="evenodd" /></svg></button>
            </td>
        `;
        row.querySelector('.supplier-history-btn').addEventListener('click', () => showSupplierHistoryModal(s));
        row.querySelector('.edit-supplier-btn').addEventListener('click', () => openSupplierModal(s));
        row.querySelector('.delete-supplier-btn').addEventListener('click', () => confirmDeleteSupplier(s));
        tableBody.appendChild(row);
    });
}

function openSupplierModal(supplier = null) {
    const form = document.getElementById('transaction-form');
    const title = document.getElementById('transaction-form-title');
    const isEdit = supplier !== null;
    title.textContent = isEdit ? `ویرایش تامین‌کننده: ${supplier.name}` : 'افزودن تامین‌کننده جدید';

    form.innerHTML = `
        <input type="hidden" name="id" value="${isEdit ? supplier.id : ''}">
        <div>
            <label for="supplier-name" class="block mb-2 text-sm font-medium text-slate-400">نام تامین‌کننده</label>
            <input type="text" name="name" id="supplier-name" value="${isEdit && supplier.name ? supplier.name : ''}" required class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5">
        </div>
        <div>
            <label for="supplier-contact" class="block mb-2 text-sm font-medium text-slate-400">فرد رابط</label>
            <input type="text" name="contactPerson" id="supplier-contact" value="${isEdit && supplier.contactPerson ? supplier.contactPerson : ''}" class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5">
        </div>
        <div>
            <label for="supplier-mobile" class="block mb-2 text-sm font-medium text-slate-400">موبایل</label>
            <input type="text" name="mobile" id="supplier-mobile" value="${isEdit && supplier.mobile ? supplier.mobile : ''}" class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5">
        </div>
        <div>
            <label for="supplier-email" class="block mb-2 text-sm font-medium text-slate-400">ایمیل</label>
            <input type="email" name="email" id="supplier-email" value="${isEdit && supplier.email ? supplier.email : ''}" class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5">
        </div>
        <button type="submit" class="w-full mt-4 text-white bg-cyan-600 hover:bg-cyan-700 focus:ring-4 focus:outline-none focus:ring-cyan-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center">${isEdit ? 'ذخیره تغییرات' : 'ثبت تامین‌کننده'}</button>
    `;
    form.onsubmit = handleSupplierSubmit;
    transactionFormModal.classList.remove('hidden');
}

async function handleSupplierSubmit(e) {
    e.preventDefault();
    const appId = firebaseConfig.projectId;
    const suppliersRef = collection(db, `artifacts/${appId}/public/data/suppliers`);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const supplierId = data.id;
    delete data.id;

    try {
        if (supplierId) {
            await setDoc(doc(db, `artifacts/${appId}/public/data/suppliers`, supplierId), data, { merge: true });
        } else {
            await addDoc(suppliersRef, data);
        }
        closeModal();
    } catch (error) {
        console.error("Error saving supplier:", error);
    }
}

function confirmDeleteSupplier(supplier) {
    const bodyHtml = `<p class="text-lg text-center text-white">آیا از حذف تامین‌کننده «${supplier.name}» اطمینان دارید؟ این عمل قابل بازگشت نیست.</p><div class="flex justify-center gap-4 mt-6"><button id="confirm-delete-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">بله، حذف کن</button><button id="cancel-delete-btn" class="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg">انصراف</button></div>`;
    showModalMessage('تایید حذف تامین‌کننده', bodyHtml);
    document.getElementById('confirm-delete-btn').onclick = () => deleteSupplier(supplier.id);
    document.getElementById('cancel-delete-btn').onclick = closeModal;
}

async function deleteSupplier(supplierId) {
    const appId = firebaseConfig.projectId;
    try {
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/suppliers`, supplierId));
        closeModal();
    } catch (error) { console.error("Error deleting supplier:", error); }
}

function openPurchaseModal() {
    const form = document.getElementById('transaction-form');
    const title = document.getElementById('transaction-form-title');
    title.textContent = 'ثبت خرید جدید از تامین‌کننده';

    if (ALL_SUPPLIERS.length === 0) {
        showModalMessage('خطا', '<p class="text-lg text-center text-red-400">ابتدا باید یک تامین‌کننده ثبت کنید.</p>');
        return;
    }
    
    const supplierOptions = ALL_SUPPLIERS.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    form.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label for="purchase-supplier" class="block mb-2 text-sm font-medium text-slate-400">انتخاب تامین‌کننده</label>
                <select name="supplierId" id="purchase-supplier" required class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5">${supplierOptions}</select>
            </div>
            <div>
                <label for="purchase-date" class="block mb-2 text-sm font-medium text-slate-400">تاریخ و ساعت خرید</label>
                <input type="datetime-local" id="purchase-date" name="orderdate" required class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5">
            </div>
            <div>
                <label for="purchase-slug" class="block mb-2 text-sm font-medium text-slate-400">اسلاگ ارز (مثلا tether)</label>
                <input type="text" name="currencie_slug" id="purchase-slug" required class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5">
            </div>
             <div>
                <label for="purchase-amount" class="block mb-2 text-sm font-medium text-slate-400">مقدار ارز خریداری شده</label>
                <input type="number" step="any" name="currency_amount" id="purchase-amount" required class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5">
            </div>
            <div>
                <label for="purchase-rate" class="block mb-2 text-sm font-medium text-slate-400">نرخ خرید (تومان)</label>
                <input type="number" step="any" name="currency_price" id="purchase-rate" required class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5">
            </div>
            <div>
                <label for="purchase-txid" class="block mb-2 text-sm font-medium text-slate-400">هش تراکنش (TxID)</label>
                <input type="text" name="Txid" id="purchase-txid" class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5">
            </div>
            <div class="md:col-span-2">
                <label for="purchase-source-wallet" class="block mb-2 text-sm font-medium text-slate-400">کیف پول مبدا (تامین‌کننده)</label>
                <input type="text" name="Source Wallet Address" id="purchase-source-wallet" class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5">
            </div>
            <div class="md:col-span-2">
                <label for="purchase-dest-wallet" class="block mb-2 text-sm font-medium text-slate-400">کیف پول مقصد (شرکت)</label>
                <input type="text" name="Destination Wallet Address" id="purchase-dest-wallet" class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5">
            </div>
        </div>
        <button type="submit" class="w-full mt-6 text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:outline-none focus:ring-emerald-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center">ثبت خرید</button>
    `;
    form.onsubmit = handlePurchaseSubmit;
    transactionFormModal.classList.remove('hidden');
}

async function handlePurchaseSubmit(e) {
    e.preventDefault();
    const appId = firebaseConfig.projectId;
    const transactionsRef = collection(db, `artifacts/${appId}/public/data/transactions`);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const currencyAmount = parseFloat(data.currency_amount);
        const currencyPrice = parseFloat(data.currency_price);
        const orderDateValue = data.orderdate;
        const orderDate = orderDateValue ? Timestamp.fromDate(new Date(orderDateValue)) : Timestamp.now();

        const newTxData = {
            orderid: `SUP-${Date.now()}`,
            orderdate: orderDate,
            currencie_slug: data.currencie_slug,
            currency_amount: currencyAmount,
            currency_price: currencyPrice,
            Txid: data.Txid || '',
            'Source Wallet Address': data['Source Wallet Address'] || '',
            'Destination Wallet Address': data['Destination Wallet Address'] || '',
            Total_Amount: currencyAmount * currencyPrice,
            transaction_source: 'supplier',
            supplierId: data.supplierId,
            services_type: 'sell',
            costBasisStatus: 'settled',
            Cost_Basis: currencyPrice,
            NetProfit: 0,
            Fix_Wage: 0,
            Vip_Amount: 0,
            Voucher_Amount: 0,
            Network_Wage: 0,
            ActualNetwork_Wage: 0,
            'Is Crypto?': true,
            createdAt: serverTimestamp(),
            creatorId: currentUser.uid,
        };

        await addDoc(transactionsRef, newTxData);
        closeModal();
    } catch (error) {
        console.error("Error saving purchase transaction:", error);
        showModalMessage('خطا', `<p class="text-lg text-center text-red-400">${error.message}</p>`);
    }
}

// --- REPORTING FUNCTIONS ---
function showSupplierHistoryModal(supplier) {
    const supplierPurchases = ALL_TRANSACTIONS
        .filter(t => t.transaction_source === 'supplier' && t.supplierId === supplier.id)
        .sort((a, b) => new Date(b.orderdate) - new Date(a.orderdate));

    let historyHtml = `<div class="table-container overflow-y-auto max-h-[60vh]"><table class="w-full text-sm text-right text-slate-400"><thead class="text-xs text-slate-300 uppercase bg-slate-800/60 sticky top-0"><tr><th class="px-4 py-2">تاریخ</th><th class="px-4 py-2">ارز</th><th class="px-4 py-2">مقدار</th><th class="px-4 py-2">نرخ خرید (تومان)</th><th class="px-4 py-2">مبلغ کل (تومان)</th><th class="px-4 py-2">TxID</th></tr></thead><tbody>`;

    if (supplierPurchases.length === 0) {
        historyHtml += `<tr><td colspan="6" class="text-center py-8">خریدی از این تامین‌کننده ثبت نشده است.</td></tr>`;
    } else {
        supplierPurchases.forEach(t => {
            historyHtml += `<tr class="border-b border-slate-700/50">
                <td class="px-4 py-3 whitespace-nowrap">${formatDateTime(new Date(t.orderdate))}</td>
                <td class="px-4 py-3 font-semibold text-white">${t.currencie_slug}</td>
                <td class="px-4 py-3 font-mono">${formatCurrency(t.currency_amount, 6)}</td>
                <td class="px-4 py-3 font-mono text-amber-400">${formatCurrency(t.currency_price, 0)}</td>
                <td class="px-4 py-3 font-mono text-cyan-400">${formatCurrency(t.Total_Amount, 0)}</td>
                <td class="px-4 py-3 font-mono text-xs truncate max-w-xs" title="${t.Txid}">${t.Txid || '---'}</td>
            </tr>`;
        });
    }
    historyHtml += '</tbody></table></div>';
    showModalMessage(`تاریخچه خرید از ${supplier.name}`, historyHtml);
}

function openComparativeReportModal() {
    const supplierPurchases = ALL_TRANSACTIONS.filter(t => t.transaction_source === 'supplier');
    const uniqueCurrencies = [...new Set(supplierPurchases.map(t => t.currencie_slug))];

    if (uniqueCurrencies.length === 0) {
        showModalMessage('گزارش مقایسه‌ای', `<p class="text-center text-lg">هنوز هیچ خرید ارزی از تامین‌کنندگان ثبت نشده است.</p>`);
        return;
    }

    const currencyOptions = uniqueCurrencies.map(slug => `<option value="${slug}">${slug}</option>`).join('');

    const bodyHtml = `
        <div class="flex items-center gap-4 mb-6">
            <label for="report-currency-select" class="text-slate-300 shrink-0">نمایش گزارش برای ارز:</label>
            <select id="report-currency-select" class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5">
                <option value="">-- انتخاب کنید --</option>
                ${currencyOptions}
            </select>
        </div>
        <div id="comparative-report-table-container">
            <p class="text-center text-slate-400">برای مشاهده گزارش، یک ارز را از لیست بالا انتخاب کنید.</p>
        </div>
    `;
    
    showModalMessage('گزارش مقایسه‌ای خرید ارز', bodyHtml);
    
    document.getElementById('report-currency-select').addEventListener('change', (e) => {
        renderComparativeReport(e.target.value);
    });
}

function renderComparativeReport(currencySlug) {
    const container = document.getElementById('comparative-report-table-container');
    if (!currencySlug) {
        container.innerHTML = `<p class="text-center text-slate-400">برای مشاهده گزارش، یک ارز را از لیست بالا انتخاب کنید.</p>`;
        return;
    }
    
    const purchases = ALL_TRANSACTIONS
        .filter(t => t.transaction_source === 'supplier' && t.currencie_slug === currencySlug)
        .sort((a, b) => a.currency_price - b.currency_price); // Sort by best price

    let tableHtml = `<div class="table-container overflow-y-auto max-h-[60vh]"><table class="w-full text-sm text-right text-slate-400"><thead class="text-xs text-slate-300 uppercase bg-slate-800/60 sticky top-0"><tr><th class="px-4 py-2">تامین‌کننده</th><th class="px-4 py-2">تاریخ</th><th class="px-4 py-2">نرخ خرید (تومان)</th><th class="px-4 py-2">مقدار خریداری شده</th></tr></thead><tbody>`;

    if (purchases.length === 0) {
        tableHtml += `<tr><td colspan="4" class="text-center py-8">خریدی برای ارز ${currencySlug} یافت نشد.</td></tr>`;
    } else {
        purchases.forEach(t => {
            const supplier = ALL_SUPPLIERS.find(s => s.id === t.supplierId);
            const supplierName = supplier ? supplier.name : 'نامشخص';
            tableHtml += `<tr class="border-b border-slate-700/50">
                <td class="px-4 py-3 font-semibold text-white">${supplierName}</td>
                <td class="px-4 py-3 whitespace-nowrap">${formatDate(new Date(t.orderdate))}</td>
                <td class="px-4 py-3 font-mono text-green-400 font-bold">${formatCurrency(t.currency_price, 0)}</td>
                <td class="px-4 py-3 font-mono">${formatCurrency(t.currency_amount, 6)}</td>
            </tr>`;
        });
    }
    tableHtml += '</tbody></table></div>';
    container.innerHTML = tableHtml;
}


// --- USERS & PERMISSIONS FUNCTIONS ---
function hasPermission(permission) {
    if (!currentUser || !currentUser.role || !roles[currentUser.role]) {
        return false;
    }
    return roles[currentUser.role].permissions && roles[currentUser.role].permissions.includes(permission);
}

function applyPermissions() {
    document.getElementById('nav-users').style.display = hasPermission('manage_users') ? 'flex' : 'none';
    document.getElementById('nav-suppliers').style.display = hasPermission('manage_suppliers') ? 'flex' : 'none';
    
    const addTxBtn = document.getElementById('add-transaction-btn');
    if (addTxBtn) addTxBtn.style.display = hasPermission('create_transactions') ? 'flex' : 'none';
    
    const exportBtn = document.getElementById('export-csv-btn');
    if (exportBtn) exportBtn.style.display = hasPermission('export_data') ? 'flex' : 'none';

    const importBtn = document.getElementById('import-csv-btn');
    if(importBtn) importBtn.style.display = hasPermission('create_transactions') ? 'flex' : 'none';
}

function renderUsersTable() {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    users.forEach(user => {
        const row = document.createElement('tr');
        row.className = 'border-b border-slate-700/50';
        row.innerHTML = `<td class="px-6 py-4">${user.name}</td><td class="px-6 py-4 font-mono">${user.email}</td><td class="px-6 py-4"><span class="px-2 py-1 text-xs rounded-full bg-sky-500/20 text-sky-300">${roles[user.role] ? roles[user.role].name : 'ناشناخته'}</span></td><td class="px-6 py-4 flex items-center gap-4"><button class="edit-user-btn text-slate-400 hover:text-amber-400" title="ویرایش"><svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" /></svg></button><button class="delete-user-btn text-slate-400 hover:text-red-400" title="حذف"><svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25-.56-1.25 1.25V4.075c.827-.05 1.66-.075 2.5-.075zM8.47 5.47a.75.75 0 011.06 0L12 7.94l2.47-2.47a.75.75 0 111.06 1.06L13.06 9l2.47 2.47a.75.75 0 11-1.06 1.06L12 10.06l-2.47 2.47a.75.75 0 01-1.06-1.06L10.94 9 8.47 6.53a.75.75 0 010-1.06z" clip-rule="evenodd" /></svg></button></td>`;
        row.querySelector('.edit-user-btn').addEventListener('click', () => openUserModal(user));
        row.querySelector('.delete-user-btn').addEventListener('click', () => confirmDeleteUser(user));
        tableBody.appendChild(row);
    });
}

function renderRolesSection() {
    const rolesSection = document.getElementById('roles-section');
    if (!rolesSection) return;
    rolesSection.innerHTML = '';
    Object.values(roles).forEach(role => {
        let roleHtml = `<div class="glass-card p-4 rounded-lg"><div class="flex justify-between items-center mb-3"><h4 class="text-md font-semibold text-cyan-400">${role.name}</h4><button class="edit-role-btn text-slate-400 hover:text-amber-400" data-role-id="${role.id}"><svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" /></svg></button></div><div class="space-y-2">`;
        Object.keys(allPermissions).forEach(permKey => {
            const checked = role.permissions && role.permissions.includes(permKey) ? 'checked' : '';
            roleHtml += `<label class="flex items-center text-sm opacity-70"><input type="checkbox" ${checked} disabled class="w-4 h-4 rounded bg-slate-700 border-slate-600 text-cyan-500"><span class="mr-2">${allPermissions[permKey]}</span></label>`;
        });
        roleHtml += `</div></div>`;
        rolesSection.innerHTML += roleHtml;
    });
    document.querySelectorAll('.edit-role-btn').forEach(btn => btn.addEventListener('click', (e) => openRoleModal(e.currentTarget.dataset.roleId)));
}

function openUserModal(user = null) {
    const form = document.getElementById('transaction-form');
    const title = document.getElementById('transaction-form-title');
    const isEdit = user !== null;
    title.textContent = isEdit ? `ویرایش کاربر: ${user.name}` : 'افزودن کاربر جدید';
    let roleOptions = Object.values(roles).map(role => `<option value="${role.id}" ${isEdit && user.role === role.id ? 'selected' : ''}>${role.name}</option>`).join('');
    form.innerHTML = `<input type="hidden" name="id" value="${isEdit ? user.id : ''}"><div><label for="user-name" class="block mb-2 text-sm font-medium text-slate-400">نام کامل</label><input type="text" name="name" id="user-name" value="${isEdit ? user.name : ''}" required class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5"></div><div><label for="user-email" class="block mb-2 text-sm font-medium text-slate-400">ایمیل</label><input type="email" name="email" id="user-email" value="${isEdit ? user.email : ''}" required class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5"></div><div><label for="user-password" class="block mb-2 text-sm font-medium text-slate-400">رمز عبور</label><input type="password" name="password" id="user-password" ${!isEdit ? 'required' : ''} placeholder="${isEdit ? 'برای تغییر، رمز جدید را وارد کنید' : 'رمز عبور را وارد کنید'}" class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5"></div><div><label for="user-role" class="block mb-2 text-sm font-medium text-slate-400">نقش</label><select name="role" id="user-role" required class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5">${roleOptions}</select></div><button type="submit" class="w-full mt-4 text-white bg-cyan-600 hover:bg-cyan-700 focus:ring-4 focus:outline-none focus:ring-cyan-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center">${isEdit ? 'ذخیره تغییرات' : 'ایجاد کاربر'}</button>`;
    form.onsubmit = handleUserSubmit;
    transactionFormModal.classList.remove('hidden');
}

async function handleUserSubmit(e) {
    e.preventDefault();
    const appId = firebaseConfig.projectId;
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const userData = { name: data.name, email: data.email, role: data.role };
    try {
        if (data.id) {
            await setDoc(doc(db, `artifacts/${appId}/public/data/users`, data.id), userData, { merge: true });
        } else {
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            userData.uid = userCredential.user.uid;
            await addDoc(collection(db, `artifacts/${appId}/public/data/users`), userData);
        }
        closeModal();
    } catch (error) { 
        console.error("Error saving user:", error); 
    }
}

function confirmDeleteUser(user) {
    const bodyHtml = `<p class="text-lg text-center text-white">آیا از حذف کاربر «${user.name}» اطمینان دارید؟</p><div class="flex justify-center gap-4 mt-6"><button id="confirm-delete-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">بله، حذف کن</button><button id="cancel-delete-btn" class="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg">انصراف</button></div>`;
    showModalMessage('تایید حذف کاربر', bodyHtml);
    document.getElementById('confirm-delete-btn').onclick = () => deleteUser(user.id);
    document.getElementById('cancel-delete-btn').onclick = closeModal;
}

async function deleteUser(userId) {
    const appId = firebaseConfig.projectId;
    try {
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/users`, userId));
        closeModal();
    } catch (error) { console.error("Error deleting user:", error); }
}

function openRoleModal(roleId = null) {
    const form = document.getElementById('transaction-form');
    const title = document.getElementById('transaction-form-title');
    const isEdit = roleId !== null;
    const role = isEdit ? roles[roleId] : null;
    title.textContent = isEdit ? `ویرایش نقش: ${role.name}` : 'افزودن نقش جدید';
    let permissionsHtml = '<div class="grid grid-cols-2 gap-2 mt-2">';
    Object.keys(allPermissions).forEach(permKey => {
        const checked = isEdit && role.permissions && role.permissions.includes(permKey) ? 'checked' : '';
        permissionsHtml += `<label class="flex items-center text-sm"><input type="checkbox" name="permissions" value="${permKey}" ${checked} class="w-4 h-4 rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-600"><span class="mr-2">${allPermissions[permKey]}</span></label>`;
    });
    permissionsHtml += '</div>';
    form.innerHTML = `<input type="hidden" name="id" value="${isEdit ? roleId : ''}"><div><label for="role-name" class="block mb-2 text-sm font-medium text-slate-400">نام نقش</label><input type="text" name="name" id="role-name" value="${isEdit ? role.name : ''}" required class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5"></div><div><label class="block mb-2 text-sm font-medium text-slate-400">دسترسی‌ها</label>${permissionsHtml}</div><button type="submit" class="w-full mt-4 text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:outline-none focus:ring-emerald-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center">${isEdit ? 'ذخیره تغییرات' : 'ایجاد نقش'}</button>`;
    form.onsubmit = handleRoleSubmit;
    transactionFormModal.classList.remove('hidden');
}

async function handleRoleSubmit(e) {
    e.preventDefault();
    const appId = firebaseConfig.projectId;
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const permissions = formData.getAll('permissions');
    const roleId = formData.get('id') || name.replace(/\s+/g, '_');
    const roleData = { name, permissions };
    try {
        await setDoc(doc(db, `artifacts/${appId}/public/data/roles`, roleId), roleData);
        closeModal();
    } catch (error) { console.error("Error saving role:", error); }
}

// --- CSV IMPORT FUNCTIONS ---
function handleCsvFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    loadingOverlay.style.display = 'flex';
    loadingText.textContent = 'در حال پردازش فایل CSV...';

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target.result;
            const data = parseCSV(text);
            await processCsvData(data);
        } catch (error) {
            console.error("Error processing CSV:", error);
            showModalMessage('خطا در پردازش فایل', `<p class="text-lg text-center text-red-400">${error.message}</p>`);
        } finally {
            loadingOverlay.style.display = 'none';
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
}

function parseCSV(text) {
    const lines = text.trim().split(/\r\n|\n/);
    if (lines.length < 2) return [];
    
    // تابع کمکی برای تجزیه هوشمند یک ردیف با در نظر گرفتن ویرگول داخل کوتیشن
    const parseRow = (row) => {
        const result = [];
        let current = '';
        let inQuote = false;
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    const headers = parseRow(lines[0]).map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const values = parseRow(lines[i]);
        // اگر تعداد مقادیر با هدرها نخواند، آن ردیف را نادیده بگیر تا خطا ایجاد نکند
        if (values.length !== headers.length) continue;
        
        const rowObject = {};
        headers.forEach((header, index) => {
            rowObject[header] = values[index] ? values[index].trim() : '';
        });
        rows.push(rowObject);
    }
    return rows;
}

async function processCsvData(data) {
    const appId = firebaseConfig.projectId;
    const batch = writeBatch(db);
    const transactionsRef = collection(db, `artifacts/${appId}/public/data/transactions`);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    const numericFields = ['userid', 'currency_amount', 'crypto_total_usdt', 'currency_price', 'Cost_Basis', 'Network Wage', 'ActualNetwork Wage', 'Fix Wage', 'Vip Amount', 'Voucher Amount', 'NetProfit'];
    
    data.forEach((row, index) => {
        try {
            const newTxData = {};
            for(const key in row) {
                if (row[key] !== '' && row[key] !== null && row[key] !== undefined) {
                    if (numericFields.includes(key)) {
                        newTxData[key] = parseFloat(row[key]) || 0;
                    } else {
                        newTxData[key] = row[key];
                    }
                }
            }

            if (!newTxData.orderid || !row.orderdate) throw new Error("orderid and orderdate are required.");
            newTxData.orderdate = Timestamp.fromDate(new Date(row.orderdate));
            newTxData['Is Crypto?'] = newTxData['Is Crypto?']?.toLowerCase() === 'true';

            // --- بخش محاسباتی کامل شده ---
            const currencyAmount = newTxData.currency_amount || 0;
            const currencyPrice = newTxData.currency_price || 0;
            const networkWage = newTxData['Network Wage'] || 0;
            const fixWage = newTxData['Fix Wage'] || 0;
            const vipAmount = newTxData['Vip Amount'] || 0;
            const voucherAmount = newTxData['Voucher Amount'] || 0;
            const networkWageToman = networkWage * currencyPrice;

            newTxData.crypto_total_usdt = currencyAmount * currencyPrice;

            if (newTxData.services_type === 'sell') { // خرید از مشتری
                newTxData.Total_Amount = newTxData.crypto_total_usdt - fixWage - vipAmount - networkWageToman + voucherAmount;
            } else { // فروش به مشتری (buy)
                newTxData.Total_Amount = newTxData.crypto_total_usdt + fixWage + vipAmount + networkWageToman - voucherAmount;
            }
            
            const usdtPoolCost = currencyPools['tether']?.weightedAvgCost || 0;
            if (usdtPoolCost > 0) {
                newTxData.usdt_equivalent_at_creation = newTxData.crypto_total_usdt / usdtPoolCost;
            } else {
                newTxData.usdt_equivalent_at_creation = 0;
            }

            newTxData.Cost_Basis = 0;
            newTxData.NetProfit = 0;
            newTxData.costBasisStatus = 'pending_import';
            newTxData.createdAt = serverTimestamp();
            newTxData.creatorId = currentUser.uid;
            newTxData.importSource = 'csv';

            const docRef = doc(transactionsRef);
            batch.set(docRef, newTxData);
            successCount++;

        } catch (e) {
            errorCount++;
            errors.push(`ردیف ${index + 2}: ${e.message}`);
        }
    });

    if (successCount > 0) {
        loadingText.textContent = `در حال ثبت ${successCount} تراکنش در پایگاه داده...`;
        await batch.commit();
    }

    let reportHtml = `<p class="text-green-400 text-lg">تعداد ${successCount} تراکنش با موفقیت برای پردازش اولیه ثبت شد.</p>`;
    if (errorCount > 0) {
        reportHtml += `<p class="text-red-400 text-lg mt-4">تعداد ${errorCount} تراکنش با خطا مواجه شد:</p>`;
        reportHtml += `<ul class="list-disc list-inside mt-2 text-red-300 text-sm max-h-60 overflow-y-auto">${errors.map(e => `<li>${e}</li>`).join('')}</ul>`;
    }
    showModalMessage('گزارش ورود دسته‌ای', reportHtml);
}

// --- AUTHENTICATION FLOW ---
function handleLogin(e) {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    loginError.classList.add('hidden');

    signInWithEmailAndPassword(auth, email, password)
        .catch(error => {
            console.error("Login failed:", error);
            loginError.textContent = "ایمیل یا رمز عبور اشتباه است.";
            loginError.classList.remove('hidden');
        });
}

function handleLogout() {
    signOut(auth).catch(error => console.error("Logout failed:", error));
}

// --- INITIALIZATION ---
async function init() {
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("YOUR_")) {
        loadingOverlay.innerHTML = '<p class="text-red-400 text-center">پیکربندی Firebase کامل نیست.<br>لطفاً کلیدهای اتصال را در کد وارد کنید.</p>';
        return;
    }

    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        loginForm.addEventListener('submit', handleLogin);
        logoutBtn.addEventListener('click', handleLogout);

        onAuthStateChanged(auth, (user) => {
            if (user && !user.isAnonymous) {
                initializeAppForUser(user);
            } else {
                currentUser = null;
                authUser = null;
                appInitialized = false;
                if(unsubscribeTransactions) unsubscribeTransactions();
                if(unsubscribeUsers) unsubscribeUsers();
                if(unsubscribeRoles) unsubscribeRoles();
                if(unsubscribeSuppliers) unsubscribeSuppliers();
                mainApp.classList.add('hidden');
                loginPage.classList.remove('hidden');
                loadingOverlay.style.display = 'none';
            }
        });
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        loadingOverlay.innerHTML = `<p class="text-red-400 text-center">خطا در اتصال به Firebase.<br>لطفاً کنسول را برای جزئیات بیشتر بررسی کنید.</p>`;
    }
}
// START: Add all of this new section
function setupTargetsLogic() {
    const openBtn = document.getElementById('open-targets-modal-btn');
    const closeBtn = document.getElementById('close-targets-modal-btn');
    const modal = document.getElementById('targets-modal');
    const form = document.getElementById('targets-form');
    const formBody = document.getElementById('targets-form-body');

    // Load targets from browser's memory (localStorage)
    const savedTargets = localStorage.getItem('kpi_targets');
    if (savedTargets) {
        KPI_TARGETS = JSON.parse(savedTargets);
    }

    const targetableKpis = {
        totalNetProfit: 'سود خالص (تومان)',
        totalSalesVolume: 'حجم فروش به مشتری (تومان)',
        salesOrdersCount: 'تعداد فروش به مشتری (عدد)'
    };

    function populateTargetsForm() {
        formBody.innerHTML = '';
        for (const key in targetableKpis) {
            const label = targetableKpis[key];
            const existingTarget = KPI_TARGETS[key] || { value: 0, period: 'monthly' };
            const html = `
                <div class="grid grid-cols-3 gap-3 items-center">
                    <label class="text-slate-300 col-span-1">${label}</label>
                    <input type="number" data-key="${key}" value="${existingTarget.value}" class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg p-2.5 col-span-1" placeholder="مقدار هدف">
                    <select data-key="${key}-period" class="bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg p-2.5 col-span-1">
                        <option value="monthly" ${existingTarget.period === 'monthly' ? 'selected' : ''}>ماهانه</option>
                        <option value="quarterly" ${existingTarget.period === 'quarterly' ? 'selected' : ''}>فصلی</option>
                        <option value="yearly" ${existingTarget.period === 'yearly' ? 'selected' : ''}>سالیانه</option>
                    </select>
                </div>
            `;
            formBody.innerHTML += html;
        }
    }

    openBtn.addEventListener('click', () => {
        populateTargetsForm();
        modal.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputs = form.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            const key = input.dataset.key;
            const value = parseFloat(input.value) || 0;
            const periodSelect = form.querySelector(`select[data-key="${key}-period"]`);
            const period = periodSelect.value;
            KPI_TARGETS[key] = { value, period };
        });

        // Save to browser's memory
        localStorage.setItem('kpi_targets', JSON.stringify(KPI_TARGETS));

        modal.classList.add('hidden');
        updateDashboardView(); // Re-render the dashboard to show progress bars
    });
}
// END: Add all of this new section
init();
   // ========== کد جدید را دقیقا اینجا اضافه کنید ==========
window.firebaseTools = {
    db,
    collection,
    query,
    where,
    getDocs,
    writeBatch,
    firebaseConfig
};
// ===============================================
