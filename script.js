// ===== Global Variables =====
let allData = [];
let filteredData = [];
let charts = {};

// Product configuration with pricing and cashback info
const PRODUCT_CONFIG = {
    'YaraMila Complex': {
        packSize: '25kg',
        price: 2400,
        cashback: 40,
        budget: 75000
    },
    'YaraLiva Nitrabor': {
        packSize: '25kg',
        price: 1600,
        cashback: 25,
        budget: 50000
    },
    'YaraVita Seniphos': {
        packSize: '500ml',
        price: 850,
        cashback: 20,
        budget: 35000
    },
    'YaraVita Bortrac': {
        packSize: '250ml',
        price: 500,
        cashback: 10,
        budget: 15000
    },
    'YaraVita Zintrac 700': {
        packSize: '250ml',
        price: 450,
        cashback: 10,
        budget: 25000
    }
};

const CASHBACK_THRESHOLD = 10000;

// ===== Utility Functions =====
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    let i = 1;
    while (i < lines.length) {
        let currentLine = lines[i];
        let row = [];
        let inQuotes = false;
        let currentField = '';
        
        for (let j = 0; j < currentLine.length; j++) {
            const char = currentLine[j];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
        }
        row.push(currentField.trim());
        
        // If we're in quotes at end of line, continue to next line
        while (inQuotes && i + 1 < lines.length) {
            i++;
            currentLine = lines[i];
            currentField += '\n';
            
            for (let j = 0; j < currentLine.length; j++) {
                const char = currentLine[j];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    row.push(currentField.trim());
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
            row.push(currentField.trim());
        }
        
        if (row.length > 1 && row.some(field => field !== '')) {
            const rowData = {};
            headers.forEach((header, index) => {
                rowData[header] = row[index] || '';
            });
            data.push(rowData);
        }
        
        i++;
    }
    
    return data;
}

function extractProductName(productString) {
    if (!productString) return '';
    
    // Extract product name before "Cashback Amount"
    const match = productString.match(/^(.*?)\s*(?:Cashback Amount|$)/);
    return match ? match[1].trim() : productString.trim();
}

function extractCashbackAmount(productString) {
    if (!productString) return 0;
    
    // Extract cashback amount from the string like "YaraLiva Nitrabor \n Cashback Amount : ₹25"
    const match = productString.match(/Cashback Amount\s*:\s*₹(\d+)/i);
    return match ? parseInt(match[1]) : 0;
}

function parseDate(dateString) {
    if (!dateString) return null;
    
    // Handle DD-MM-YYYY format
    const parts = dateString.split(/[\s-]/);
    if (parts.length >= 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parseInt(parts[2]);
        return new Date(year, month, day);
    }
    
    return new Date(dateString);
}

function formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN');
}

function formatNumber(num) {
    return num.toLocaleString('en-IN');
}

// ===== Data Processing Functions =====
function calculateOrderValue(order) {
    let totalValue = 0;
    
    for (let i = 1; i <= 5; i++) {
        const productName = extractProductName(order[`Product Name ${i}`]);
        const quantity = parseInt(order[`Product Quantity ${i}`]) || 0;
        
        if (productName && PRODUCT_CONFIG[productName]) {
            totalValue += PRODUCT_CONFIG[productName].price * quantity;
        }
    }
    
    return totalValue;
}

function calculateOrderCashback(order, farmerTotalValue) {
    // Only eligible if farmer's total verified value >= 10000 and this order status is Verified
    if (farmerTotalValue < CASHBACK_THRESHOLD || order['Approval Status'] !== 'Verified') {
        return 0;
    }
    
    let totalCashback = 0;
    
    for (let i = 1; i <= 5; i++) {
        const productString = order[`Product Name ${i}`];
        const quantity = parseInt(order[`Product Quantity ${i}`]) || 0;
        
        if (productString) {
            // Try to extract cashback from the product string first
            const cashbackFromString = extractCashbackAmount(productString);
            
            if (cashbackFromString > 0) {
                totalCashback += cashbackFromString * quantity;
            } else {
                // Fallback to product config
                const productName = extractProductName(productString);
                if (productName && PRODUCT_CONFIG[productName]) {
                    totalCashback += PRODUCT_CONFIG[productName].cashback * quantity;
                }
            }
        }
    }
    
    return totalCashback;
}

function calculateFarmerTotals() {
    const farmerTotals = {};
    
    // First pass: calculate total verified value per farmer
    filteredData.forEach(order => {
        const farmerMobile = order['Farmer Mobile'];
        const isVerified = order['Approval Status'] === 'Verified';
        
        if (!farmerTotals[farmerMobile]) {
            farmerTotals[farmerMobile] = {
                totalValue: 0,
                verifiedValue: 0,
                orders: []
            };
        }
        
        const orderValue = calculateOrderValue(order);
        farmerTotals[farmerMobile].totalValue += orderValue;
        
        if (isVerified) {
            farmerTotals[farmerMobile].verifiedValue += orderValue;
        }
        
        farmerTotals[farmerMobile].orders.push(order);
    });
    
    return farmerTotals;
}

function getProductSales() {
    const sales = {};
    
    Object.keys(PRODUCT_CONFIG).forEach(product => {
        sales[product] = { units: 0, cashback: 0, orders: 0 };
    });
    
    const farmerTotals = calculateFarmerTotals();
    
    filteredData.forEach(order => {
        const farmerMobile = order['Farmer Mobile'];
        const farmerVerifiedTotal = farmerTotals[farmerMobile]?.verifiedValue || 0;
        const orderCashback = calculateOrderCashback(order, farmerVerifiedTotal);
        const isWinner = orderCashback > 0;
        
        for (let i = 1; i <= 5; i++) {
            const productString = order[`Product Name ${i}`];
            const quantity = parseInt(order[`Product Quantity ${i}`]) || 0;
            
            if (productString) {
                const productName = extractProductName(productString);
                
                if (productName && sales[productName]) {
                    sales[productName].units += quantity;
                    sales[productName].orders++;
                    
                    if (isWinner) {
                        // Try to get cashback from string first, then fallback to config
                        const cashbackFromString = extractCashbackAmount(productString);
                        
                        if (cashbackFromString > 0) {
                            sales[productName].cashback += cashbackFromString * quantity;
                        } else if (PRODUCT_CONFIG[productName]) {
                            sales[productName].cashback += PRODUCT_CONFIG[productName].cashback * quantity;
                        }
                    }
                }
            }
        }
    });
    
    return sales;
}

function getCropAnalysis() {
    const cropCounts = {};
    
    filteredData.forEach(order => {
        const crops = order['Crops Selected'];
        if (crops) {
            // Split by comma and trim
            const cropList = crops.split(',').map(c => c.trim()).filter(c => c);
            cropList.forEach(crop => {
                cropCounts[crop] = (cropCounts[crop] || 0) + 1;
            });
        }
    });
    
    return cropCounts;
}

function getDistrictAnalysis() {
    const districtData = {};
    const farmerTotals = calculateFarmerTotals();
    
    filteredData.forEach(order => {
        const district = order['District'] || 'Unknown';
        const farmerMobile = order['Farmer Mobile'];
        const farmerVerifiedTotal = farmerTotals[farmerMobile]?.verifiedValue || 0;
        const orderCashback = calculateOrderCashback(order, farmerVerifiedTotal);
        const isWinner = orderCashback > 0;
        
        if (!districtData[district]) {
            districtData[district] = {
                totalFarmers: new Set(),
                winners: new Set(),
                orders: 0,
                totalCashback: 0
            };
        }
        
        districtData[district].totalFarmers.add(farmerMobile);
        districtData[district].orders++;
        
        if (isWinner) {
            districtData[district].winners.add(farmerMobile);
            districtData[district].totalCashback += orderCashback;
        }
    });
    
    // Convert sets to counts
    Object.keys(districtData).forEach(district => {
        districtData[district].totalFarmersCount = districtData[district].totalFarmers.size;
        districtData[district].winnersCount = districtData[district].winners.size;
    });
    
    return districtData;
}

function getRetailerAnalysis() {
    const retailerData = {};
    
    filteredData.forEach(order => {
        const rin = order['RIN'];
        const retailerName = order['Retailer Name'];
        const farmerMobile = order['Farmer Mobile'];
        const status = order['Approval Status'];
        
        if (!retailerData[rin]) {
            retailerData[rin] = {
                name: retailerName,
                orders: 0,
                farmers: new Set(),
                verified: 0,
                totalUnits: 0
            };
        }
        
        retailerData[rin].orders++;
        retailerData[rin].farmers.add(farmerMobile);
        
        if (status === 'Verified') {
            retailerData[rin].verified++;
        }
        
        // Count total units
        for (let i = 1; i <= 5; i++) {
            const quantity = parseInt(order[`Product Quantity ${i}`]) || 0;
            retailerData[rin].totalUnits += quantity;
        }
    });
    
    // Convert to array and calculate verification rate
    const retailers = Object.keys(retailerData).map(rin => ({
        rin,
        name: retailerData[rin].name,
        orders: retailerData[rin].orders,
        farmers: retailerData[rin].farmers.size,
        verified: retailerData[rin].verified,
        totalUnits: retailerData[rin].totalUnits,
        verificationRate: (retailerData[rin].verified / retailerData[rin].orders * 100).toFixed(1)
    }));
    
    // Sort by orders
    retailers.sort((a, b) => b.orders - a.orders);
    
    return retailers;
}

// ===== Update Dashboard Functions =====
function updateKeyMetrics() {
    // Total scans
    document.getElementById('totalScans').textContent = formatNumber(filteredData.length);
    
    // Unique farmers
    const uniqueFarmers = new Set(filteredData.map(o => o['Farmer Mobile'])).size;
    document.getElementById('uniqueFarmers').textContent = formatNumber(uniqueFarmers);
    
    // Status counts - Count based on Approval Status column
    const pending = filteredData.filter(o => o['Approval Status'] === 'Pending').length;
    const verified = filteredData.filter(o => o['Approval Status'] === 'Verified').length;
    const rejected = filteredData.filter(o => o['Approval Status'] === 'Rejected').length;
    
    document.getElementById('pendingCount').textContent = formatNumber(pending);
    document.getElementById('verifiedCount').textContent = formatNumber(verified);
    document.getElementById('rejectedCount').textContent = formatNumber(rejected);
    
    // Cashback winners - Calculate per farmer with total verified amount >= 10000
    const farmerTotals = calculateFarmerTotals();
    const winnersSet = new Set();
    let totalCashback = 0;
    
    filteredData.forEach(order => {
        const farmerMobile = order['Farmer Mobile'];
        const farmerVerifiedTotal = farmerTotals[farmerMobile]?.verifiedValue || 0;
        const cashback = calculateOrderCashback(order, farmerVerifiedTotal);
        
        if (cashback > 0) {
            winnersSet.add(farmerMobile);
            totalCashback += cashback;
        }
    });
    
    document.getElementById('cashbackWinners').textContent = formatNumber(winnersSet.size);
    document.getElementById('totalCashback').textContent = formatCurrency(totalCashback);
    
    // Active retailers
    const activeRetailers = new Set(filteredData.map(o => o['RIN'])).size;
    document.getElementById('activeRetailers').textContent = formatNumber(activeRetailers);
}

function updateProductUnitsChart() {
    const sales = getProductSales();
    const products = Object.keys(sales);
    const units = products.map(p => sales[p].units);
    
    const ctx = document.getElementById('productUnitsChart').getContext('2d');
    
    if (charts.productUnits) {
        charts.productUnits.destroy();
    }
    
    charts.productUnits = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: products,
            datasets: [{
                label: 'Units Ordered',
                data: units,
                backgroundColor: [
                    '#00695f',
                    '#4db6ac',
                    '#ffb300',
                    '#ff7043',
                    '#ab47bc'
                ],
                borderColor: [
                    '#004d40',
                    '#00897b',
                    '#ff9800',
                    '#ff5722',
                    '#9c27b0'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Units: ' + formatNumber(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

function updateCashbackChart() {
    const sales = getProductSales();
    const products = Object.keys(sales);
    const cashbacks = products.map(p => sales[p].cashback);
    
    const ctx = document.getElementById('cashbackChart').getContext('2d');
    
    if (charts.cashback) {
        charts.cashback.destroy();
    }
    
    charts.cashback = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: products,
            datasets: [{
                label: 'Cashback Distributed',
                data: cashbacks,
                backgroundColor: 'rgba(0, 105, 95, 0.8)',
                borderColor: '#004d40',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Cashback: ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

function updateStatusPieChart() {
    const pending = filteredData.filter(o => o['Approval Status'] === 'Pending').length;
    const verified = filteredData.filter(o => o['Approval Status'] === 'Verified').length;
    const rejected = filteredData.filter(o => o['Approval Status'] === 'Rejected').length;
    
    const ctx = document.getElementById('statusPieChart').getContext('2d');
    
    if (charts.statusPie) {
        charts.statusPie.destroy();
    }
    
    charts.statusPie = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Verified', 'Pending', 'Rejected'],
            datasets: [{
                data: [verified, pending, rejected],
                backgroundColor: [
                    '#4caf50',
                    '#ff9800',
                    '#f44336'
                ],
                borderColor: '#ffffff',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return context.label + ': ' + formatNumber(context.parsed) + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

function updateCropChart() {
    const cropAnalysis = getCropAnalysis();
    const crops = Object.keys(cropAnalysis).sort((a, b) => cropAnalysis[b] - cropAnalysis[a]).slice(0, 10);
    const counts = crops.map(c => cropAnalysis[c]);
    
    const ctx = document.getElementById('cropChart').getContext('2d');
    
    if (charts.crop) {
        charts.crop.destroy();
    }
    
    charts.crop = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: crops,
            datasets: [{
                label: 'Orders Count',
                data: counts,
                backgroundColor: '#4db6ac',
                borderColor: '#00897b',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Orders: ' + formatNumber(context.parsed.x);
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

function updateDistrictChart() {
    const districtAnalysis = getDistrictAnalysis();
    const districts = Object.keys(districtAnalysis)
        .filter(d => d !== 'Unknown')
        .sort((a, b) => districtAnalysis[b].totalFarmersCount - districtAnalysis[a].totalFarmersCount)
        .slice(0, 10);
    
    const farmerCounts = districts.map(d => districtAnalysis[d].totalFarmersCount);
    const winnerCounts = districts.map(d => districtAnalysis[d].winnersCount);
    
    const ctx = document.getElementById('districtChart').getContext('2d');
    
    if (charts.district) {
        charts.district.destroy();
    }
    
    charts.district = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: districts,
            datasets: [
                {
                    label: 'Total Farmers',
                    data: farmerCounts,
                    backgroundColor: 'rgba(77, 182, 172, 0.7)',
                    borderColor: '#4db6ac',
                    borderWidth: 2
                },
                {
                    label: 'Cashback Winners',
                    data: winnerCounts,
                    backgroundColor: 'rgba(0, 105, 95, 0.9)',
                    borderColor: '#004d40',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatNumber(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

function updateBudgetTracking() {
    const sales = getProductSales();
    
    Object.keys(PRODUCT_CONFIG).forEach(product => {
        const config = PRODUCT_CONFIG[product];
        const productSales = sales[product];
        const consumed = productSales.cashback;
        const remaining = config.budget - consumed;
        const percentage = (consumed / config.budget * 100).toFixed(1);
        
        const elementId = 'budget' + product.replace(/\s+/g, '');
        const element = document.getElementById(elementId);
        
        if (element) {
            const remainingSpan = element.querySelector('.budget-remaining');
            const consumedBar = element.querySelector('.budget-consumed');
            const stats = element.querySelectorAll('.budget-stats strong');
            
            remainingSpan.textContent = formatCurrency(remaining) + ' Remaining';
            remainingSpan.style.color = remaining > 0 ? '#4caf50' : '#f44336';
            
            consumedBar.style.width = Math.min(percentage, 100) + '%';
            
            if (stats.length >= 3) {
                stats[0].textContent = formatNumber(productSales.units);
                stats[1].textContent = formatCurrency(consumed);
            }
        }
    });
}

function updateTopRetailersTable() {
    const retailers = getRetailerAnalysis();
    const top10 = retailers.slice(0, 10);
    
    const tbody = document.getElementById('topRetailersTable');
    
    if (top10.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = top10.map((retailer, index) => {
        const rankClass = index < 3 ? `rank-${index + 1}` : '';
        const medal = index < 3 ? `<span class="medal ${rankClass}">${index + 1}</span>` : index + 1;
        
        return `
            <tr>
                <td>${medal}</td>
                <td>${retailer.rin}</td>
                <td>${retailer.name}</td>
                <td>${formatNumber(retailer.orders)}</td>
                <td>${formatNumber(retailer.farmers)}</td>
                <td>${formatNumber(retailer.totalUnits)}</td>
                <td>${retailer.verificationRate}%</td>
            </tr>
        `;
    }).join('');
}

function updateDistrictMap() {
    const districtAnalysis = getDistrictAnalysis();
    const districts = Object.keys(districtAnalysis)
        .filter(d => d !== 'Unknown' && d !== '')
        .sort((a, b) => districtAnalysis[b].winnersCount - districtAnalysis[a].winnersCount);
    
    const mapGrid = document.getElementById('districtMapGrid');
    
    if (districts.length === 0) {
        mapGrid.innerHTML = '<p class="no-data">No district data available</p>';
        return;
    }
    
    mapGrid.innerHTML = districts.map(district => {
        const data = districtAnalysis[district];
        const isActive = data.winnersCount > 0;
        
        return `
            <div class="district-item ${isActive ? 'active' : ''}">
                <h4>${district}</h4>
                <div class="district-winners">${formatNumber(data.winnersCount)}</div>
                <div class="district-stats">Winners</div>
                <div class="district-total">Total: ${formatNumber(data.totalFarmersCount)} farmers</div>
            </div>
        `;
    }).join('');
}

function updateAllCharts() {
    updateKeyMetrics();
    updateProductUnitsChart();
    updateCashbackChart();
    updateStatusPieChart();
    updateCropChart();
    updateDistrictChart();
    updateBudgetTracking();
    updateTopRetailersTable();
    updateDistrictMap();
    updateIndiaMap();
}

// ===== India Map with Leaflet =====
let indiaMapInstance = null;
let mapMarkers = [];

// Approximate coordinates for Uttar Pradesh districts
const UP_DISTRICTS_COORDS = {
    'Agra': [27.1767, 78.0081],
    'Aligarh': [27.8974, 78.0880],
    'Allahabad': [25.4358, 81.8463],
    'Prayagraj': [25.4358, 81.8463],
    'Ambedkar Nagar': [26.4052, 82.6979],
    'Amethi': [26.1590, 81.8102],
    'Amroha': [28.9034, 78.4671],
    'Auraiya': [26.4655, 79.5134],
    'Azamgarh': [26.0686, 83.1840],
    'Baghpat': [28.9465, 77.2177],
    'Bahraich': [27.5742, 81.5947],
    'Ballia': [25.7599, 84.1495],
    'Balrampur': [27.4308, 82.1821],
    'Banda': [25.4774, 80.3350],
    'Barabanki': [26.9243, 81.1859],
    'Bareilly': [28.3670, 79.4304],
    'Basti': [26.7835, 82.7386],
    'Bijnor': [29.3732, 78.1369],
    'Budaun': [28.0296, 79.1140],
    'Bulandshahr': [28.4055, 77.8483],
    'Chandauli': [25.2654, 83.2720],
    'Chitrakoot': [25.2021, 80.8893],
    'Deoria': [26.5024, 83.7791],
    'Etah': [27.5553, 78.6656],
    'Etawah': [26.7855, 79.0215],
    'Faizabad': [26.7756, 82.1454],
    'Ayodhya': [26.7756, 82.1454],
    'Farrukhabad': [27.3882, 79.5782],
    'Fatehpur': [25.9301, 80.8120],
    'Firozabad': [27.1591, 78.3957],
    'Gautam Buddha Nagar': [28.3587, 77.5349],
    'Noida': [28.3587, 77.5349],
    'Ghaziabad': [28.6692, 77.4538],
    'Ghazipur': [25.5882, 83.5775],
    'Gonda': [27.1333, 81.9615],
    'Gorakhpur': [26.7606, 83.3732],
    'Hamirpur': [25.9564, 80.1521],
    'Hapur': [28.7303, 77.7761],
    'Hardoi': [27.3968, 80.1311],
    'Hathras': [27.5947, 78.0436],
    'Jalaun': [26.1446, 79.3349],
    'Jaunpur': [25.7463, 82.6838],
    'Jhansi': [25.4484, 78.5685],
    'Kannauj': [27.0514, 79.9174],
    'Kanpur Dehat': [26.4609, 79.6555],
    'Kanpur Nagar': [26.4499, 80.3319],
    'Kanpur': [26.4499, 80.3319],
    'Kasganj': [27.8094, 78.6422],
    'Kaushambi': [25.5311, 81.3784],
    'Kheri': [27.9061, 80.7851],
    'Lakhimpur Kheri': [27.9061, 80.7851],
    'Kushinagar': [26.7417, 83.8938],
    'Lalitpur': [24.6911, 78.4118],
    'Lucknow': [26.8467, 80.9462],
    'Maharajganj': [27.1433, 83.5608],
    'Mahoba': [25.2920, 79.8731],
    'Mainpuri': [27.2352, 79.0270],
    'Mathura': [27.4924, 77.6737],
    'Mau': [25.9417, 83.5611],
    'Meerut': [28.9845, 77.7064],
    'Mirzapur': [25.1460, 82.5690],
    'Moradabad': [28.8389, 78.7378],
    'Muzaffarnagar': [29.4727, 77.7085],
    'Pilibhit': [28.6315, 79.8048],
    'Pratapgarh': [25.8967, 81.9431],
    'Raebareli': [26.2124, 81.2331],
    'Rampur': [28.8103, 79.0252],
    'Saharanpur': [29.9680, 77.5460],
    'Sambhal': [28.5850, 78.5703],
    'Sant Kabir Nagar': [26.7652, 83.0361],
    'Shahjahanpur': [27.8800, 79.9117],
    'Shamli': [29.4496, 77.3107],
    'Shravasti': [27.5104, 82.0513],
    'Siddharthnagar': [27.2555, 83.0741],
    'Sitapur': [27.5670, 80.6820],
    'Sonbhadra': [24.6924, 83.0679],
    'Sultanpur': [26.2644, 82.0739],
    'Unnao': [26.5464, 80.4880],
    'Varanasi': [25.3176, 82.9739],
    'Kashi': [25.3176, 82.9739]
};

function initializeIndiaMap() {
    if (indiaMapInstance) {
        indiaMapInstance.remove();
    }
    
    // Initialize map centered on Uttar Pradesh
    indiaMapInstance = L.map('indiaMap').setView([27.0, 80.0], 7);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
        minZoom: 6
    }).addTo(indiaMapInstance);
    
    // Add custom styling to map
    const mapContainer = document.getElementById('indiaMap');
    mapContainer.style.border = '2px solid #00695f';
    mapContainer.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
}

function updateIndiaMap() {
    if (!indiaMapInstance) {
        initializeIndiaMap();
    }
    
    // Clear existing markers
    mapMarkers.forEach(marker => marker.remove());
    mapMarkers = [];
    
    const districtAnalysis = getDistrictAnalysis();
    
    // Find max winners for scaling
    const maxWinners = Math.max(...Object.values(districtAnalysis).map(d => d.winnersCount), 1);
    
    Object.keys(districtAnalysis).forEach(district => {
        const coords = UP_DISTRICTS_COORDS[district];
        if (!coords) return;
        
        const data = districtAnalysis[district];
        const winnersCount = data.winnersCount;
        const totalFarmers = data.totalFarmersCount;
        const totalCashback = data.totalCashback || 0;
        
        // Scale marker size based on winners count
        const baseSize = 10;
        const maxSize = 40;
        const size = baseSize + (winnersCount / maxWinners) * (maxSize - baseSize);
        
        // Color based on activity level
        let color = '#b2dfdb'; // Low
        if (winnersCount > maxWinners * 0.6) {
            color = '#00695f'; // High
        } else if (winnersCount > maxWinners * 0.3) {
            color = '#4db6ac'; // Medium
        }
        
        // Create circle marker
        const marker = L.circleMarker(coords, {
            radius: size / 2,
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(indiaMapInstance);
        
        // Create popup content
        const popupContent = `
            <div style="font-family: 'Segoe UI', sans-serif; padding: 8px;">
                <h4 style="margin: 0 0 8px 0; color: #00695f; font-size: 1.1rem;">${district}</h4>
                <div style="font-size: 0.9rem;">
                    <p style="margin: 4px 0;"><strong>Total Farmers:</strong> ${formatNumber(totalFarmers)}</p>
                    <p style="margin: 4px 0; color: #00695f;"><strong>Cashback Winners:</strong> ${formatNumber(winnersCount)}</p>
                    <p style="margin: 4px 0;"><strong>Total Orders:</strong> ${formatNumber(data.orders)}</p>
                    <p style="margin: 4px 0; color: #ff9800;"><strong>Total Cashback:</strong> ${formatCurrency(totalCashback)}</p>
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        
        // Add hover effect
        marker.on('mouseover', function() {
            this.setStyle({
                radius: size / 2 + 3,
                fillOpacity: 1
            });
        });
        
        marker.on('mouseout', function() {
            this.setStyle({
                radius: size / 2,
                fillOpacity: 0.8
            });
        });
        
        mapMarkers.push(marker);
    });
}

// ===== Filter Functions =====
function populateFilters() {
    // Get unique values
    const districts = [...new Set(allData.map(o => o['District']).filter(d => d))].sort();
    const retailers = [...new Set(allData.map(o => o['Retailer Name']).filter(r => r))].sort();
    
    const crops = new Set();
    allData.forEach(order => {
        const cropList = order['Crops Selected'];
        if (cropList) {
            cropList.split(',').map(c => c.trim()).filter(c => c).forEach(crop => crops.add(crop));
        }
    });
    const cropsList = [...crops].sort();
    
    const products = Object.keys(PRODUCT_CONFIG);
    
    // Populate dropdowns
    const districtFilter = document.getElementById('districtFilter');
    districts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        districtFilter.appendChild(option);
    });
    
    const cropFilter = document.getElementById('cropFilter');
    cropsList.forEach(crop => {
        const option = document.createElement('option');
        option.value = crop;
        option.textContent = crop;
        cropFilter.appendChild(option);
    });
    
    const productFilter = document.getElementById('productFilter');
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product;
        option.textContent = product;
        productFilter.appendChild(option);
    });
    
    const retailerFilter = document.getElementById('retailerFilter');
    retailers.forEach(retailer => {
        const option = document.createElement('option');
        option.value = retailer;
        option.textContent = retailer;
        retailerFilter.appendChild(option);
    });
}

function applyFilters() {
    const searchTerm = document.getElementById('universalSearch').value.toLowerCase();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const district = document.getElementById('districtFilter').value;
    const landAcreage = document.getElementById('landAcreageFilter').value;
    const crop = document.getElementById('cropFilter').value;
    const product = document.getElementById('productFilter').value;
    const retailer = document.getElementById('retailerFilter').value;
    
    filteredData = allData.filter(order => {
        // Search filter
        if (searchTerm) {
            const searchableText = [
                order['Farmer Name'],
                order['Farmer Mobile'],
                order['Retailer Name'],
                order['Order ID'],
                order['RIN']
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        
        // Date filter
        if (startDate || endDate) {
            const orderDate = parseDate(order['Date of Entry']);
            if (orderDate) {
                if (startDate && orderDate < new Date(startDate)) return false;
                if (endDate && orderDate > new Date(endDate)) return false;
            }
        }
        
        // District filter
        if (district && order['District'] !== district) {
            return false;
        }
        
        // Land Acreage filter
        if (landAcreage) {
            const acreage = parseFloat(order['Land Acreage']) || 0;
            const [min, max] = landAcreage.split('-').map(v => v.replace('+', ''));
            
            if (landAcreage === '25+') {
                if (acreage < 25) return false;
            } else {
                const minVal = parseFloat(min) || 0;
                const maxVal = parseFloat(max) || Infinity;
                if (acreage < minVal || acreage > maxVal) return false;
            }
        }
        
        // Crop filter
        if (crop) {
            const crops = order['Crops Selected'];
            if (!crops || !crops.includes(crop)) {
                return false;
            }
        }
        
        // Product filter
        if (product) {
            let hasProduct = false;
            for (let i = 1; i <= 5; i++) {
                const productName = extractProductName(order[`Product Name ${i}`]);
                if (productName === product) {
                    hasProduct = true;
                    break;
                }
            }
            if (!hasProduct) {
                return false;
            }
        }
        
        // Retailer filter
        if (retailer && order['Retailer Name'] !== retailer) {
            return false;
        }
        
        return true;
    });
    
    updateAllCharts();
    updateCascadingFilters();
}

function updateCascadingFilters() {
    // This function updates filter options based on current selection
    // Implementing reverse cascading - each filter affects others
    
    const currentFilters = {
        district: document.getElementById('districtFilter').value,
        crop: document.getElementById('cropFilter').value,
        product: document.getElementById('productFilter').value,
        retailer: document.getElementById('retailerFilter').value
    };
    
    // Get available options from filtered data
    const availableDistricts = new Set(filteredData.map(o => o['District']).filter(d => d));
    const availableCrops = new Set();
    const availableProducts = new Set();
    const availableRetailers = new Set(filteredData.map(o => o['Retailer Name']).filter(r => r));
    
    filteredData.forEach(order => {
        // Crops
        const crops = order['Crops Selected'];
        if (crops) {
            crops.split(',').map(c => c.trim()).filter(c => c).forEach(crop => availableCrops.add(crop));
        }
        
        // Products
        for (let i = 1; i <= 5; i++) {
            const productName = extractProductName(order[`Product Name ${i}`]);
            if (productName && PRODUCT_CONFIG[productName]) {
                availableProducts.add(productName);
            }
        }
    });
    
    // Update filter dropdowns while preserving current selection
    updateFilterOptions('districtFilter', availableDistricts, currentFilters.district);
    updateFilterOptions('cropFilter', availableCrops, currentFilters.crop);
    updateFilterOptions('productFilter', availableProducts, currentFilters.product);
    updateFilterOptions('retailerFilter', availableRetailers, currentFilters.retailer);
}

function updateFilterOptions(filterId, availableOptions, currentValue) {
    const select = document.getElementById(filterId);
    const options = Array.from(select.options);
    
    options.forEach(option => {
        if (option.value === '') return; // Keep "All" option
        
        if (availableOptions.has(option.value)) {
            option.disabled = false;
            option.style.display = '';
        } else {
            option.disabled = true;
            option.style.display = 'none';
        }
    });
}

function resetFilters() {
    document.getElementById('universalSearch').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('dateRangeFilter').value = '';
    document.getElementById('districtFilter').value = '';
    document.getElementById('landAcreageFilter').value = '';
    document.getElementById('cropFilter').value = '';
    document.getElementById('productFilter').value = '';
    document.getElementById('retailerFilter').value = '';
    
    document.getElementById('clearSearch').classList.remove('visible');
    
    filteredData = [...allData];
    updateAllCharts();
    populateFilters(); // Re-enable all options
}

// ===== Download Function =====
function downloadReport() {
    // Create CSV content
    let csv = 'Order ID,Date of Entry,RIN,Retailer Name,Farmer Name,Farmer Mobile,District,Crops Selected,';
    csv += 'Approval Status,Order Value,Farmer Total Verified,Cashback Amount,Is Winner\n';
    
    const farmerTotals = calculateFarmerTotals();
    
    filteredData.forEach(order => {
        const farmerMobile = order['Farmer Mobile'];
        const farmerVerifiedTotal = farmerTotals[farmerMobile]?.verifiedValue || 0;
        const orderValue = calculateOrderValue(order);
        const cashback = calculateOrderCashback(order, farmerVerifiedTotal);
        const isWinner = cashback > 0 ? 'Yes' : 'No';
        
        csv += `${order['Order ID']},`;
        csv += `${order['Date of Entry']},`;
        csv += `${order['RIN']},`;
        csv += `"${order['Retailer Name']}",`;
        csv += `"${order['Farmer Name']}",`;
        csv += `${order['Farmer Mobile']},`;
        csv += `${order['District']},`;
        csv += `"${order['Crops Selected']}",`;
        csv += `${order['Approval Status']},`;
        csv += `${orderValue},`;
        csv += `${farmerVerifiedTotal},`;
        csv += `${cashback},`;
        csv += `${isWinner}\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `yara_cashback_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===== Initialize Dashboard =====
async function initDashboard() {
    try {
        // Show loading overlay
        document.getElementById('loadingOverlay').classList.remove('hidden');
        
        // Load CSV data
        const response = await fetch('yara_cbc.csv');
        const csvText = await response.text();
        
        // Parse data
        allData = parseCSV(csvText);
        filteredData = [...allData];
        
        // Populate filters
        populateFilters();
        
        // Update dashboard
        updateAllCharts();
        
        // Update last updated time
        document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
        
        // Hide loading overlay
        setTimeout(() => {
            document.getElementById('loadingOverlay').classList.add('hidden');
        }, 500);
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        alert('Error loading dashboard data. Please check the console for details.');
    }
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
    // Initialize dashboard
    initDashboard();
    
    // Search functionality
    const searchInput = document.getElementById('universalSearch');
    const clearSearch = document.getElementById('clearSearch');
    
    searchInput.addEventListener('input', (e) => {
        if (e.target.value) {
            clearSearch.classList.add('visible');
        } else {
            clearSearch.classList.remove('visible');
        }
        
        // Debounce search
        clearTimeout(searchInput.debounceTimer);
        searchInput.debounceTimer = setTimeout(() => {
            applyFilters();
        }, 300);
    });
    
    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        clearSearch.classList.remove('visible');
        applyFilters();
    });
    
    // Date Range Picker functionality
    const dateRangeInput = document.getElementById('dateRangeFilter');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    dateRangeInput.addEventListener('click', function() {
        // Create a simple date range modal
        const currentStart = startDateInput.value;
        const currentEnd = endDateInput.value;
        
        const modal = document.createElement('div');
        modal.className = 'date-range-modal';
        modal.innerHTML = `
            <div class="date-range-modal-content">
                <h3>Select Date Range</h3>
                <div class="date-range-inputs-modal">
                    <div>
                        <label>Start Date:</label>
                        <input type="date" id="modalStartDate" value="${currentStart}">
                    </div>
                    <div>
                        <label>End Date:</label>
                        <input type="date" id="modalEndDate" value="${currentEnd}">
                    </div>
                </div>
                <div class="date-range-buttons">
                    <button class="btn-apply" id="applyDateRange">Apply</button>
                    <button class="btn-clear" id="clearDateRange">Clear</button>
                    <button class="btn-cancel" id="cancelDateRange">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Apply button
        document.getElementById('applyDateRange').addEventListener('click', () => {
            const start = document.getElementById('modalStartDate').value;
            const end = document.getElementById('modalEndDate').value;
            
            startDateInput.value = start;
            endDateInput.value = end;
            
            if (start && end) {
                dateRangeInput.value = `${start} to ${end}`;
            } else if (start) {
                dateRangeInput.value = `From ${start}`;
            } else if (end) {
                dateRangeInput.value = `Until ${end}`;
            } else {
                dateRangeInput.value = '';
            }
            
            applyFilters();
            document.body.removeChild(modal);
        });
        
        // Clear button
        document.getElementById('clearDateRange').addEventListener('click', () => {
            startDateInput.value = '';
            endDateInput.value = '';
            dateRangeInput.value = '';
            applyFilters();
            document.body.removeChild(modal);
        });
        
        // Cancel button
        document.getElementById('cancelDateRange').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    });
    
    // Filter listeners
    document.getElementById('districtFilter').addEventListener('change', applyFilters);
    document.getElementById('landAcreageFilter').addEventListener('change', applyFilters);
    document.getElementById('cropFilter').addEventListener('change', applyFilters);
    document.getElementById('productFilter').addEventListener('change', applyFilters);
    document.getElementById('retailerFilter').addEventListener('change', applyFilters);
    
    // Reset filters
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    // Download report
    document.getElementById('downloadBtn').addEventListener('click', downloadReport);
});
