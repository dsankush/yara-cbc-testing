# 🚀 Quick Start Guide - Yara Cashback Campaign Dashboard

## Step 1: Add Your Logo

You need to add the Yara logo to the project directory:

1. Place your `yara_logo.png` file in this directory (same folder as index.html)
2. The logo should be in PNG format
3. Recommended size: 200x60 pixels or similar aspect ratio

**Current files in directory:**
- ✅ index.html
- ✅ styles.css
- ✅ script.js
- ✅ yara_cbc.csv
- ⚠️ yara_logo.png (YOU NEED TO ADD THIS)

## Step 2: Open the Dashboard

**Method 1: Direct File Opening (Simple)**
- Double-click `index.html` to open in your default browser
- Works for most modern browsers

**Method 2: Local Server (Recommended)**

Using Python:
```bash
python -m http.server 8000
```

Using Node.js:
```bash
npx http-server
```

Then open: `http://localhost:8000`

## Step 3: Explore the Dashboard

### Top Metrics
- View total scans, unique farmers, approval statuses
- See cashback winners and total cashback distributed
- Check active retailers count

### Charts & Visualizations
- Product-wise unit sales (bar chart)
- Cashback distribution by product
- Approval status breakdown (pie chart)
- Crop-wise analysis
- District-wise farmer distribution
- Budget tracking with progress bars
- Top 10 retailers table
- District map of Uttar Pradesh

### Use Filters
1. **Date Range**: Select start and end dates
2. **District**: Filter by specific district
3. **Crop**: Filter by crop type (handles multiple crops)
4. **Product**: Filter by specific product
5. **Retailer**: Filter by retailer name

All filters work together - selecting one updates the others!

### Search
- Use the search bar at the top
- Search by: Farmer Name, Mobile, Retailer, Order ID, RIN
- Results update in real-time

### Download Report
- Click "Download Report" button in the header
- Gets a CSV file with filtered data
- Includes calculated order values and cashback amounts
- Filename includes today's date

## ⚡ Tips for Best Experience

1. **Use Latest Browser**: Chrome, Firefox, Safari, or Edge
2. **Internet Required**: For Chart.js and Font Awesome icons
3. **Screen Size**: Best viewed on desktop (1366px+), but responsive for mobile
4. **Performance**: Dashboard handles large datasets efficiently
5. **Print Ready**: Use browser print (Ctrl+P / Cmd+P) for reports

## 🎯 Key Insights to Look For

1. **Cashback Eligibility**: Only orders ≥ ₹10,000 with "Verified" status win cashback
2. **Budget Status**: Check which products are close to budget limits
3. **Top Performers**: Identify best-performing retailers
4. **Geographic Spread**: See which districts have most engagement
5. **Crop Preferences**: Understand which crops farmers are growing

## 📊 Data Updates

To update the dashboard with new data:
1. Replace `yara_cbc.csv` with the updated file
2. Refresh the browser (F5 or Ctrl+R)
3. Dashboard will reload with new data

## 🆘 Quick Troubleshooting

**Problem: Dashboard shows "Loading..." forever**
- Solution: Check browser console (F12), verify CSV file is in same folder

**Problem: Charts not showing**
- Solution: Check internet connection (Chart.js needs to load)

**Problem: Logo not displaying**
- Solution: Add yara_logo.png file to the directory

**Problem: Filters not working**
- Solution: Click "Reset Filters" button and try again

**Problem: Some data looks wrong**
- Solution: Verify CSV file format matches the expected structure

## 📱 Mobile Access

The dashboard is fully responsive:
- Works on tablets and phones
- Adjusted layouts for smaller screens
- All features accessible on mobile

## 🎨 Customization

If you need to change:
- **Colors**: Edit `styles.css` (CSS variables at top)
- **Products**: Edit `PRODUCT_CONFIG` in `script.js`
- **Cashback Threshold**: Edit `CASHBACK_THRESHOLD` in `script.js`
- **Budget Values**: Update `PRODUCT_CONFIG` in `script.js`

---

**Need Help?** Refer to `DASHBOARD_README.md` for detailed documentation.

**Ready to start?** Open `index.html` and explore your campaign data!
