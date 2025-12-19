# Yara Cashback Campaign Dashboard

## 📊 Overview

A fully functional, advanced analytical dashboard for the Yara Cashback Campaign. This dashboard provides comprehensive insights into campaign performance, farmer engagement, retailer activities, and cashback distribution.

## ✨ Features

### Key Analytics
- **Total Scans**: Count of all order entries
- **Unique Farmers**: Distinct farmer count based on mobile numbers
- **Approval Status Tracking**: Pending, Verified, and Rejected orders
- **Cashback Winners**: Farmers who won cashback (orders ≥ ₹10,000)
- **Total Cashback Distributed**: Sum of all eligible cashback amounts
- **Active Retailers**: Number of unique retailers participating

### Visualizations

1. **Product-wise Units Ordered** (Bar Chart)
   - Shows total units ordered for each of the 5 products
   - Color-coded bars for easy identification

2. **Product-wise Cashback Distribution** (Bar Chart)
   - Displays cashback distributed per product
   - Only includes verified orders ≥ ₹10,000

3. **Approval Status Distribution** (Doughnut Chart)
   - Visual breakdown of Verified, Pending, and Rejected orders
   - Shows percentage distribution

4. **Crop-wise Analysis** (Horizontal Bar Chart)
   - Top 10 crops selected by farmers
   - Handles comma-separated crop values

5. **District-wise Farmers** (Grouped Bar Chart)
   - Compares total farmers vs cashback winners by district
   - Focuses on Uttar Pradesh districts

6. **Budget Tracking & Sales Performance**
   - Real-time budget consumption tracking for each product
   - Shows consumed vs remaining budget with visual progress bars
   - Displays total units/bags sold per product

7. **Top 10 Performing Retailers** (Table)
   - Ranked by total orders
   - Shows RIN, retailer name, orders, unique farmers, units sold, and verification rate
   - Medal icons for top 3 retailers

8. **District Map Visualization**
   - Grid layout showing all districts
   - Displays cashback winners vs total farmers per district
   - Color-coded active districts

### Filters & Search

**Cascading Filters:**
- Date Range (Start Date - End Date)
- District
- Crop
- Product
- Retailer Name

All filters are interconnected and update each other based on available data.

**Universal Search Bar:**
- Search by Farmer Name, Mobile, Retailer Name, Order ID, or RIN
- Real-time search with debouncing
- Clear button for quick reset

### Export Functionality
- **Download Report** button generates a CSV file with:
  - Filtered data
  - Calculated order values
  - Cashback amounts
  - Winner status
  - Timestamp in filename

## 🎯 Cashback Logic

A farmer is eligible for cashback when:
1. Total order value ≥ ₹10,000
2. Order status is "Verified"

When eligible:
- Cashback = Sum of (Product Quantity × Product Cashback Amount) for all products in the order

## 💰 Product Configuration

| Product | Pack Size | Price/Unit | Cashback/Unit | Budget |
|---------|-----------|------------|---------------|--------|
| YaraMila Complex | 25 Kg | ₹2,400 | ₹40 | ₹75,000 |
| YaraLiva Nitrabor | 25 Kg | ₹1,600 | ₹25 | ₹50,000 |
| YaraVita Seniphos | 500 ML | ₹850 | ₹20 | ₹35,000 |
| YaraVita Bortrac | 250 ML | ₹500 | ₹10 | ₹15,000 |
| YaraVita Zintrac 700 | 250 ML | ₹450 | ₹10 | ₹25,000 |

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- The `yara_cbc.csv` file in the same directory
- The `yara_logo.png` file in the same directory

### Installation

1. Place all files in the same directory:
   ```
   /your-folder/
   ├── index.html
   ├── styles.css
   ├── script.js
   ├── yara_cbc.csv
   └── yara_logo.png
   ```

2. Open `index.html` in your web browser

That's it! The dashboard will automatically load and display your data.

### Running on a Local Server (Optional)

For better performance, you can run it on a local server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## 📁 File Structure

- **index.html** - Main HTML structure with all dashboard components
- **styles.css** - Complete styling with Yara brand colors and responsive design
- **script.js** - All JavaScript logic for data processing, analytics, and visualizations
- **yara_cbc.csv** - Campaign data (your existing file)
- **yara_logo.png** - Yara company logo (add this file)

## 🎨 Design Features

- **Yara Brand Colors**: Professional color scheme matching Yara's brand identity
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Professional Icons**: Font Awesome icons throughout (no emojis)
- **Modern UI**: Gradient backgrounds, smooth animations, and card-based layout
- **Accessibility**: Proper contrast ratios and readable fonts
- **Print-Ready**: Optimized print styles for generating reports

## 🔧 Customization

### Updating Product Configuration

Edit the `PRODUCT_CONFIG` object in `script.js`:

```javascript
const PRODUCT_CONFIG = {
    'Product Name': {
        packSize: '25kg',
        price: 2400,
        cashback: 40,
        budget: 75000
    }
};
```

### Changing Cashback Threshold

Edit the `CASHBACK_THRESHOLD` constant in `script.js`:

```javascript
const CASHBACK_THRESHOLD = 10000; // Change this value
```

### Modifying Colors

Edit CSS variables in `styles.css`:

```css
:root {
    --primary-color: #00695f;
    --secondary-color: #4db6ac;
    --accent-color: #ffb300;
    /* Add more color customizations */
}
```

## 📊 Analytics Calculations

### Order Value
```
Order Value = Σ (Product Price × Product Quantity) for all products in order
```

### Cashback Amount
```
If Order Value ≥ ₹10,000 AND Status = "Verified":
    Cashback = Σ (Product Cashback × Product Quantity)
Else:
    Cashback = 0
```

### Verification Rate (Retailers)
```
Verification Rate = (Verified Orders / Total Orders) × 100
```

### Budget Consumed
```
Budget Consumed = Σ (Product Cashback × Quantity) for all eligible orders
Budget Remaining = Total Budget - Budget Consumed
```

## 🐛 Troubleshooting

### Dashboard not loading
- Check browser console for errors (F12)
- Ensure `yara_cbc.csv` is in the same directory
- Try running on a local server instead of opening file directly

### Charts not displaying
- Ensure you have internet connection (Chart.js loads from CDN)
- Check if Chart.js CDN is accessible
- Clear browser cache and reload

### Filters not working
- Check if data is loaded (look at console logs)
- Verify CSV file format matches expected structure
- Try resetting filters

### Logo not showing
- Add `yara_logo.png` file to the directory
- Check file name matches exactly (case-sensitive)
- Verify image file is valid PNG format

## 📱 Browser Support

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ⚠️ Internet Explorer (not supported)

## 📄 License

This dashboard is created for Yara International's internal use.

## 👨‍💻 Technical Details

### Libraries Used
- **Chart.js 4.4.1** - For all data visualizations
- **Font Awesome 6.5.1** - For professional icons

### Data Processing
- Pure vanilla JavaScript (no frameworks)
- Efficient data filtering and caching
- Debounced search for better performance

### Performance
- Optimized for large datasets
- Lazy chart rendering
- Efficient DOM manipulation

## 📞 Support

For questions or issues, please contact your development team or Yara IT support.

---

**Dashboard Version:** 1.0  
**Last Updated:** December 2025  
**Campaign:** Yara Cashback Campaign
