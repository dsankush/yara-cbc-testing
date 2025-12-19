// ===== Global Variables =====
let allData = [];
let filteredData = [];
let charts = {};
let indiaMapInstance = null;
let mapMarkers = [];

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

// Approximate coordinates for Uttar Pradesh districts
const UP_DISTRICTS_COORDS = {
    'Agra': [27.1767, 78.0081],
    'Aligarh': [27.8974, 78.0880],
    'Amroha': [28.9034, 78.4671],
    'Moradabad': [28.8389, 78.7378],
    'Bareilly': [28.3670, 79.4304],
    'Meerut': [28.9845, 77.7064],
    'Ghaziabad': [28.6692, 77.4538],
    'Bulandshahr': [28.4055, 77.8483],
    'Gautam Buddha Nagar': [28.3587, 77.5349],
    'Noida': [28.3587, 77.5349]
};

// ===== Utility Functions =====
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
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
    }
    
    return data;
}

function extractProductName(productString) {
    if (!productString) return '';
    
    // Remove quotes and extract product name before "Cashback Amount"
    const cleanString = productString.replace(/^["']|["']$/g, '').trim();
    const match = cleanString.match(/^(.*?)\s*(?:Cashback Amount|$)/i);
    return match ? match[1].trim() : cleanString;
}

function extractCashbackAmount(productString) {
    if (!productString) return 0;
    
    // Extract cashback amount from the string like "YaraLiva Nitrabor \n Cashback Amount : ₹25"
    const match = productString.match(/Cashback Amount\s*[:：]\s*₹?(\d+)/i);
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
    return '₹' + Math.round(amount).toLocaleString('en-IN');
}

function formatNumber(num) {
    return Math.round(num).toLocaleString('en-IN');
}

// ===== Data Processing Functions =====
function calculateOrderValue(order) {
    let totalValue = 0;
    
    for (let i = 1; i <= 5; i++) {
        const productString = order[`Product Name ${i}`];
        const quantity = parseInt(order[`Product Quantity ${i}`]) || 0;
        
        if (productString && quantity > 0) {
            const productName = extractProductName(productString);
            
            if (PRODUCT_CONFIG[productName]) {
                totalValue += PRODUCT_CONFIG[productName].price * quantity;
            }
        }
    }
    
    return totalValue;
}

function calculateFarmerTotals() {
    const farmerTotals = {};
    
    // First pass: calculate total verified value per farmer
    filteredData.forEach(order => {
        const farmerMobile = order['Farmer Mobile'];
        const isVerified = order['Approval Status']?.trim() === 'Verified';
        
        if (!farmerMobile) return;
        
        if (!farmerTotals[farmerMobile]) {
            farmerTotals[farmerMobile] = {
                totalValue: 0,
                verifiedValue: 0,
                orders: [],
                verifiedOrders: 0
            };
        }
        
        const orderValue = calculateOrderValue(order);
        farmerTotals[farmerMobile].totalValue += orderValue;
        farmerTotals[farmerMobile].orders.push(order);
        
        if (isVerified) {
            farmerTotals[farmerMobile].verifiedValue += orderValue;
            farmerTotals[farmerMobile].verifiedOrders++;
        }
    });
    
    return farmerTotals;
}

function calculateOrderCashback(order, farmerVerifiedTotal) {
    // Only eligible if farmer's total verified value >= 10000 and this order status is Verified
    const isVerified = order['Approval Status']?.trim() === 'Verified';
    
    if (farmerVerifiedTotal < CASHBACK_THRESHOLD || !isVerified) {
        return 0;
    }
    
    let totalCashback = 0;
    
    for (let i = 1; i <= 5; i++) {
        const productString = order[`Product Name ${i}`];
        const quantity = parseInt(order[`Product Quantity ${i}`]) || 0;
        
        if (productString && quantity > 0) {
            // Try to extract cashback from the product string first
            let cashbackPerUnit = extractCashbackAmount(productString);
            
            // Fallback to product config if not found in string
            if (cashbackPerUnit === 0) {
                const productName = extractProductName(productString);
                if (PRODUCT_CONFIG[productName]) {
                    cashbackPerUnit = PRODUCT_CONFIG[productName].cashback;
                }
            }
            
            totalCashback += cashbackPerUnit * quantity;
        }
    }
    
    return totalCashback;
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
        
        for (let i = 1; i <= 5; i++) {
            const productString = order[`Product Name ${i}`];
            const quantity = parseInt(order[`Product Quantity ${i}`]) || 0;
            
            if (productString && quantity > 0) {
                const productName = extractProductName(productString);
                
                if (productName && sales[productName]) {
                    sales[productName].units += quantity;
                    sales[productName].orders++;
                    
                    if (orderCashback > 0) {
                        // Get cashback for this specific product in this order
                        let cashbackPerUnit = extractCashbackAmount(productString);
                        if (cashbackPerUnit === 0 && PRODUCT_CONFIG[productName]) {
                            cashbackPerUnit = PRODUCT_CONFIG[productName].cashback;
                        }
                        sales[productName].cashback += cashbackPerUnit * quantity;
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
        const district = order['District']?.trim() || 'Unknown';
        const farmerMobile = order['Farmer Mobile'];
        const farmerVerifiedTotal = farmerTotals[farmerMobile]?.verifiedValue || 0;
        const orderCashback = calculateOrderCashback(order, farmerVerifiedTotal);
        
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
        
        if (orderCashback > 0) {
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
        const status = order['Approval Status']?.trim();
        
        if (!rin) return;
        
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
    
    // Sort by orders descending
    retailers.sort((a, b) => b.orders - a.orders);
    
    return retailers;
}

// ===== Update Dashboard Functions =====
function updateKeyMetrics() {
    // Total scans
    document.getElementById('totalScans').textContent = formatNumber(filteredData.length);
    
    // Unique farmers
    const uniqueFarmers = new Set(filteredData.map(o => o['Farmer Mobile']).filter(m => m)).size;
    document.getElementById('uniqueFarmers').textContent = formatNumber(uniqueFarmers);
    
    // Status counts - DIRECTLY from Approval Status column
    const pending = filteredData.filter(o => o['Approval Status']?.trim() === 'Pending').length;
    const verified = filteredData.filter(o => o['Approval Status']?.trim() === 'Verified').length;
    const rejected = filteredData.filter(o => o['Approval Status']?.trim() === 'Rejected').length;
    
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
    const activeRetailers = new Set(filteredData.map(o => o['RIN']).filter(r => r)).size;
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
    const pending = filteredData.filter(o => o['Approval Status']?.trim() === 'Pending').length;
    const verified = filteredData.filter(o => o['Approval Status']?.trim() === 'Verified').length;
    const rejected = filteredData.filter(o => o['Approval Status']?.trim() === 'Rejected').length;
    
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
                            const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
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
        .filter(d => d !== 'Unknown' && d !== '')
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

// ===== India Map with Leaflet =====
function initializeIndiaMap() {
    const mapElement = document.getElementById('indiaMap');
    if (!mapElement) {
        console.error('Map element not found');
        return;
    }
    
    if (indiaMapInstance) {
        indiaMapInstance.remove();
        indiaMapInstance = null;
    }
    
    try {
        // Initialize map centered on Uttar Pradesh
        indiaMapInstance = L.map('indiaMap').setView([27.0, 80.0], 7);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18,
            minZoom: 6
        }).addTo(indiaMapInstance);
        
        // Add custom styling to map
        mapElement.style.border = '2px solid #00695f';
        mapElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        
        console.log('Map initialized successfully');
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

function updateIndiaMap() {
    if (!indiaMapInstance) {
        initializeIndiaMap();
        // Wait a bit for map to initialize
        setTimeout(updateIndiaMap, 500);
        return;
    }
    
    // Clear existing markers
    mapMarkers.forEach(marker => {
        try {
            marker.remove();
        } catch (e) {
            console.error('Error removing marker:', e);
        }
    });
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
        
        try {
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
        } catch (error) {
            console.error('Error creating marker for', district, ':', error);
        }
    });
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
        if (district && order['District']?.trim() !== district) {
            return false;
        }
        
        // Land Acreage filter
        if (landAcreage) {
            const acreage = parseFloat(order['Land Acreage']) || 0;
            
            if (landAcreage === '0-5' && (acreage < 0 || acreage > 5)) return false;
            if (landAcreage === '5-10' && (acreage < 5 || acreage > 10)) return false;
            if (landAcreage === '10-25' && (acreage < 10 || acreage > 25)) return false;
            if (landAcreage === '25+' && acreage < 25) return false;
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
        
        console.log('Data loaded:', allData.length, 'rows');
        
        // Populate filters
        populateFilters();
        
        // Update dashboard
        updateAllCharts();
        
        // Initialize map after a short delay to ensure DOM is ready
        setTimeout(() => {
            initializeIndiaMap();
            updateIndiaMap();
        }, 1000);
        
        // Update last updated time
        document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
        
        // Hide loading overlay
        setTimeout(() => {
            document.getElementById('loadingOverlay').classList.add('hidden');
        }, 500);
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        alert('Error loading dashboard data. Please check the console for details.');
        document.getElementById('loadingOverlay').classList.add('hidden');
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
    
    // Date Range functionality - simple version
    const dateRangeInput = document.getElementById('dateRangeFilter');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    dateRangeInput.addEventListener('click', function() {
        const currentStart = startDateInput.value;
        const currentEnd = endDateInput.value;
        
        const startPrompt = prompt('Enter start date (YYYY-MM-DD):', currentStart);
        if (startPrompt !== null) {
            startDateInput.value = startPrompt;
            
            const endPrompt = prompt('Enter end date (YYYY-MM-DD):', currentEnd);
            if (endPrompt !== null) {
                endDateInput.value = endPrompt;
                
                if (startPrompt && endPrompt) {
                    dateRangeInput.value = `${startPrompt} to ${endPrompt}`;
                } else if (startPrompt) {
                    dateRangeInput.value = `From ${startPrompt}`;
                } else if (endPrompt) {
                    dateRangeInput.value = `Until ${endPrompt}`;
                }
                
                applyFilters();
            }
        }
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
