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

function calculateOrderCashback(order) {
    const orderValue = calculateOrderValue(order);
    
    // Only eligible if order value >= 10000 and status is Verified
    if (orderValue < CASHBACK_THRESHOLD || order['Approval Status'] !== 'Verified') {
        return 0;
    }
    
    let totalCashback = 0;
    
    for (let i = 1; i <= 5; i++) {
        const productName = extractProductName(order[`Product Name ${i}`]);
        const quantity = parseInt(order[`Product Quantity ${i}`]) || 0;
        
        if (productName && PRODUCT_CONFIG[productName]) {
            totalCashback += PRODUCT_CONFIG[productName].cashback * quantity;
        }
    }
    
    return totalCashback;
}

function getProductSales() {
    const sales = {};
    
    Object.keys(PRODUCT_CONFIG).forEach(product => {
        sales[product] = { units: 0, cashback: 0, orders: 0 };
    });
    
    filteredData.forEach(order => {
        const orderCashback = calculateOrderCashback(order);
        const isWinner = orderCashback > 0;
        
        for (let i = 1; i <= 5; i++) {
            const productName = extractProductName(order[`Product Name ${i}`]);
            const quantity = parseInt(order[`Product Quantity ${i}`]) || 0;
            
            if (productName && sales[productName]) {
                sales[productName].units += quantity;
                sales[productName].orders++;
                
                if (isWinner && PRODUCT_CONFIG[productName]) {
                    sales[productName].cashback += PRODUCT_CONFIG[productName].cashback * quantity;
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
    
    filteredData.forEach(order => {
        const district = order['District'] || 'Unknown';
        const farmerMobile = order['Farmer Mobile'];
        const orderCashback = calculateOrderCashback(order);
        const isWinner = orderCashback > 0;
        
        if (!districtData[district]) {
            districtData[district] = {
                totalFarmers: new Set(),
                winners: new Set(),
                orders: 0
            };
        }
        
        districtData[district].totalFarmers.add(farmerMobile);
        districtData[district].orders++;
        
        if (isWinner) {
            districtData[district].winners.add(farmerMobile);
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
    
    // Status counts
    const pending = filteredData.filter(o => o['Approval Status'] === 'Pending').length;
    const verified = filteredData.filter(o => o['Approval Status'] === 'Verified').length;
    const rejected = filteredData.filter(o => o['Approval Status'] === 'Rejected').length;
    
    document.getElementById('pendingCount').textContent = formatNumber(pending);
    document.getElementById('verifiedCount').textContent = formatNumber(verified);
    document.getElementById('rejectedCount').textContent = formatNumber(rejected);
    
    // Cashback winners
    const winnersSet = new Set();
    let totalCashback = 0;
    
    filteredData.forEach(order => {
        const cashback = calculateOrderCashback(order);
        if (cashback > 0) {
            winnersSet.add(order['Farmer Mobile']);
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
    document.getElementById('districtFilter').value = '';
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
    csv += 'Approval Status,Order Value,Cashback Amount,Is Winner\n';
    
    filteredData.forEach(order => {
        const orderValue = calculateOrderValue(order);
        const cashback = calculateOrderCashback(order);
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
    
    // Filter listeners
    document.getElementById('startDate').addEventListener('change', applyFilters);
    document.getElementById('endDate').addEventListener('change', applyFilters);
    document.getElementById('districtFilter').addEventListener('change', applyFilters);
    document.getElementById('cropFilter').addEventListener('change', applyFilters);
    document.getElementById('productFilter').addEventListener('change', applyFilters);
    document.getElementById('retailerFilter').addEventListener('change', applyFilters);
    
    // Reset filters
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    // Download report
    document.getElementById('downloadBtn').addEventListener('click', downloadReport);
});
