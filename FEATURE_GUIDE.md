# Yara Cashback Campaign Dashboard - Feature Guide

## 🎯 Overview
This dashboard provides comprehensive analytics for the Yara Cashback Campaign with advanced filtering, interactive maps, and detailed metrics.

## 📊 Key Metrics

### Top Row Metrics:
1. **Total Scans** - Total number of QR code scans/entries
2. **Unique Farmers** - Count of distinct farmers who participated
3. **Pending Approvals** - Orders with "Pending" approval status
4. **Verified Orders** - Orders with "Verified" approval status
5. **Rejected Orders** - Orders with "Rejected" approval status

### Cashback Metrics Row:
1. **Cashback Winners** - Farmers whose total verified orders ≥ ₹10,000
2. **Total Cashback Distributed** - Sum of all eligible cashback (₹ icon)
3. **Active Retailers** - Number of retailers with at least one order

## 🔍 Filters

### 1. Universal Search
- Search across: Farmer Name, Mobile, Retailer Name, Order ID, RIN
- Real-time filtering with debounce
- Clear button for quick reset

### 2. Date Range Filter
- **Single Click Interface** - Click to open modal
- **Modal Features**:
  - Start Date picker
  - End Date picker
  - Apply, Clear, Cancel buttons
- **Display**: Shows selected range in readable format
- **Use Case**: Filter orders by entry date

### 3. District Filter
- Dropdown with all available districts
- Cascading filter - updates based on other selections
- Use Case: Focus on specific geographic regions

### 4. Land Acreage Filter ⭐ NEW
- **Ranges**:
  - 0-5 acres (Small farmers)
  - 5-10 acres (Medium farmers)
  - 10-25 acres (Large farmers)
  - 25+ acres (Very large farmers)
- **Use Case**: Analyze participation by farm size

### 5. Crop Filter
- Filter by crop type (potato, wheat, etc.)
- Multi-crop orders handled intelligently

### 6. Product Filter
- Filter by Yara product purchased
- Extracts from Product Name 1-5 columns

### 7. Retailer Filter
- Filter by specific retailer
- Shows active retailers only

### 8. Reset Filters
- One-click reset to clear all filters
- Restores original dataset

## 🗺️ Interactive India Map ⭐ NEW

### Features:
- **Technology**: Leaflet.js mapping library
- **Coverage**: Uttar Pradesh districts with coordinates
- **Interactive Elements**:
  - Circle markers sized by winner count
  - Color-coded activity levels:
    - Dark Teal: High activity
    - Medium Teal: Medium activity
    - Light Teal: Low activity
  
### Popup Information (Click any district):
- Total Farmers
- Cashback Winners
- Total Orders
- Total Cashback Distributed

### Controls:
- Zoom in/out buttons
- Pan by dragging
- Hover for highlight effect
- Click for detailed popup

## 📈 Charts & Visualizations

### 1. Product-wise Units Ordered
- Horizontal bar chart
- Shows total units sold per product
- Color-coded by product

### 2. Product-wise Cashback Distribution
- Bar chart showing cashback paid per product
- Helps track budget consumption

### 3. Approval Status Distribution
- Doughnut chart
- Shows proportion of Pending/Verified/Rejected
- Percentage labels on hover

### 4. Budget Tracking & Sales Performance
- Individual cards per product
- Shows:
  - Budget remaining
  - Bags/units sold
  - Budget consumed
  - Progress bar
- Real-time budget monitoring

### 5. Crop-wise Analysis
- Top 10 crops by order count
- Horizontal bar chart
- Helps understand farmer crop preferences

### 6. District-wise Farmers
- Comparison of total farmers vs cashback winners
- Grouped bar chart
- Top 10 districts shown

### 7. Top 10 Performing Retailers
- Table with rankings (Gold/Silver/Bronze medals for top 3)
- Metrics:
  - Total Orders
  - Unique Farmers
  - Total Units Sold
  - Verification Rate (%)

### 8. District-wise Statistics Grid
- Card-based layout
- Each district shows:
  - Number of winners
  - Total farmers
  - Active/inactive highlighting

## 💰 Cashback Eligibility Logic

### Rules Implemented:
1. **Minimum Purchase**: Farmer must have total verified orders ≥ ₹10,000
2. **Aggregation**: System sums ALL orders per farmer (by mobile number)
3. **Verification Required**: Only "Verified" status orders count
4. **Multi-Order Support**: Farmers with multiple entries handled correctly

### Calculation Process:
```
For each farmer:
  1. Find all their orders
  2. Sum verified order values
  3. If total ≥ ₹10,000:
     - Calculate cashback for each verified order
     - Use quantity × cashback rate
     - Extract cashback from product string OR use config
  4. Farmer becomes "Cashback Winner"
```

### Price Table (PRODUCT_CONFIG):
- YaraMila Complex: ₹2,400/bag, ₹40 cashback
- YaraLiva Nitrabor: ₹1,600/bag, ₹25 cashback
- YaraVita Seniphos: ₹850/unit, ₹20 cashback
- YaraVita Bortrac: ₹500/unit, ₹10 cashback
- YaraVita Zintrac 700: ₹450/unit, ₹10 cashback

## 🎨 Design Features

### Color Scheme:
- Primary: Yara Green (#00695f)
- Secondary: Light Teal (#4db6ac)
- Accent: Amber (#ffb300)
- Status Colors: Green (verified), Orange (pending), Red (rejected)

### Responsive Design:
- Desktop: Full grid layout
- Tablet: Adaptive columns
- Mobile: Single column, optimized touch targets

### Animations:
- Fade-in on load
- Hover effects on cards
- Smooth transitions
- Loading overlay

## 📥 Download Report

### Features:
- Export filtered data to CSV
- Includes:
  - All order details
  - Calculated order values
  - Farmer total verified amount
  - Cashback amounts
  - Winner status
- Filename: `yara_cashback_report_YYYY-MM-DD.csv`

## 🔄 Real-time Updates

All metrics and charts update automatically when:
- Filters are changed
- Search is performed
- Date range is modified
- Any filter combination is applied

## 🚀 Performance

### Optimizations:
- Debounced search (300ms)
- Efficient data filtering
- Cascading filter updates
- Chart reuse (destroy & recreate)
- Lazy map marker rendering

## 📱 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🛠️ Technical Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **Charts**: Chart.js 4.4.1
- **Maps**: Leaflet.js 1.9.4
- **Icons**: Font Awesome 6.5.1
- **Styling**: CSS3 with CSS Variables
- **Data Format**: CSV

## 💡 Tips for Best Use

1. **Start Broad**: Begin with no filters to see overall statistics
2. **Drill Down**: Apply filters progressively to analyze specific segments
3. **Compare Districts**: Use the map to identify high-performing regions
4. **Monitor Budget**: Check budget tracking regularly to manage cashback funds
5. **Export Data**: Download filtered datasets for offline analysis
6. **Check Winners**: Use the ≥₹10,000 threshold to identify eligible farmers

## 🆘 Troubleshooting

### If data doesn't load:
- Check if `yara_cbc.csv` is in the same directory
- Verify CSV format is correct
- Check browser console for errors

### If map doesn't show:
- Ensure internet connection (Leaflet requires CDN)
- Check if Leaflet CSS/JS loaded correctly
- Verify district names match coordinates

### If filters don't work:
- Clear browser cache
- Check console for JavaScript errors
- Reset all filters and try again

## 📞 Support

For technical issues or questions, refer to the implementation files:
- `index.html` - Structure
- `script.js` - Logic & calculations
- `styles.css` - Styling
- `UPDATES_SUMMARY.md` - Recent changes

---

**Version**: 2.0  
**Last Updated**: December 2025  
**Dashboard**: Yara Cashback Campaign Analytics
