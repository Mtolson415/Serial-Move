# Bulk Serial Move - Setup Guide

This guide walks you through installing and configuring the two Tampermonkey scripts for automated serial moves.

---

## Overview

Two scripts work together:

1. **Excel Tab Script** (`BulkSerialMove_ExcelTab.js`) — Reads from STAGING sheet, sends items to Box tab
2. **Box Tab Script** (`BulkSerialMove_BoxTab.js`) — Fills form fields, submits serials, handles retries

The scripts communicate through the browser's `localStorage` mechanism (cross-tab messaging).

---

## Prerequisites

- ✓ Firefox with Tampermonkey extension installed
- ✓ Office 365 Excel (browser-based)
- ✓ Box asset management web interface (in a tab)
- ✓ Both tabs open in the same Firefox container

---

## Step 1: Install Scripts in Tampermonkey

### Excel Tab Script

1. Open Tampermonkey dashboard
2. Click **Create a new script**
3. Delete the default template code
4. Copy the entire contents of `BulkSerialMove_ExcelTab.js`
5. Paste into the script editor
6. Click **File → Save** (Ctrl+S)
7. Verify script appears in Tampermonkey list

### Box Tab Script

1. Repeat steps 1-6 above, but use `BulkSerialMove_BoxTab.js` instead

---

## Step 2: Configure Excel Tab Script

### Check Your Configuration

Open `BulkSerialMove_ExcelTab.js` in the Tampermonkey editor:

```javascript
const CONFIG = {
  STAGING_SHEET: 'STAGING',           // ← Confirm this sheet name
  PROCESSED_SHEET: 'PROCESSED',       // ← Confirm this sheet name
  SERIALS_CHECK_SHEET: 'Serials2Check', // ← Confirm this sheet name
  BOXNAME_COLUMN: 'BOXNAME',          // ← Confirm this column header
  SERIAL_COLUMN: 'SERIAL',            // ← Confirm this column header
};
```

**Verify these match your Excel workbook exactly** (including capitalization).

---

## Step 3: Find Element IDs for Box Tab Script

This is the key step. You'll find the HTML element IDs using Firefox DevTools.

### Open the Box Form

1. Go to the Box asset management page in your browser
2. Right-click on the **BOXNAME input field**
3. Select **Inspect Element** (or press F12)
4. In the DevTools panel, you'll see the HTML element
5. Look for the `id` attribute

**Example:**
```html
<input type="text" id="boxNameInput" placeholder="Enter box...">
```

In this example, the ID is `boxNameInput`.

### Find Each Element ID

Repeat the above process for these elements:

| Element | What to Inspect | Look for in HTML |
|---------|-----------------|------------------|
| **BOXNAME input** | The "Box Name" text field | `<input ... id="???"` |
| **BOXNAME send button** | Button that sends box name | `<button ... id="???"` |
| **SERIAL input** | The "Serial Number" text field | `<input ... id="???"` |
| **SERIAL send button** | Button that sends serial number | `<button ... id="???"` |
| **Success message text** | Popup/message after move | Look at the exact text displayed |

### Document Your Findings

Create a simple text file with your findings:

```
BOXNAME Input ID: boxNameInput
BOXNAME Send Button ID: submitBoxName
SERIAL Input ID: serialNumberInput
SERIAL Send Button ID: submitSerial
Success Message Text: Item successfully moved
```

---

## Step 4: Fill in Tokens in Box Tab Script

Open `BulkSerialMove_BoxTab.js` in Tampermonkey editor and update this section:

```javascript
const CONFIG = {
  // Replace TOKEN_xxx with actual IDs from Step 3
  BOXNAME_INPUT_ID: 'boxNameInput',              // ← Your actual ID
  BOXNAME_SEND_BUTTON_ID: 'submitBoxName',       // ← Your actual ID
  SERIAL_INPUT_ID: 'serialNumberInput',          // ← Your actual ID
  SERIAL_SEND_BUTTON_ID: 'submitSerial',         // ← Your actual ID
  SUCCESS_MESSAGE_TEXT: 'Item successfully moved', // ← Your actual text
};
```

**Save the script** (Ctrl+S).

---

## Step 5: Prepare Your Excel Workbook

Ensure your workbook has these three sheets with exact names:

1. **STAGING** — Your input data with columns:
   - `BOXNAME` — Destination box/location
   - `SERIAL` — Serial number to move

   Example:
   ```
   BOXNAME          | SERIAL
   Storage Bin A    | SN123456
   Storage Bin B    | SN123457
   Storage Bin A    | SN123458
   ```

2. **PROCESSED** — Destination for successful moves (empty for now)
   - Headers: `BOXNAME`, `SERIAL` (will auto-populate)

3. **Serials2Check** — Destination for failed items (empty for now)
   - Headers: `BOXNAME`, `SERIAL` (will auto-populate)

---

## Step 6: Test the Setup

### Test Run (Small Batch)

1. **Box tab:** Open your Box form page
2. **Excel tab:** Open your workbook
3. **Box tab:** Check console (F12 → Console tab) for messages
4. **Excel tab:** Look for the blue **"Start Bulk Serial Move"** button (bottom-right)
5. Click the button and select **OK** in the confirmation dialog
6. **Watch both tabs:**
   - Box tab should fill fields and process
   - Excel tab should show progress
   - Processed items should move to appropriate sheets

### Troubleshooting

**Button doesn't appear on Excel tab:**
- Ensure you're on an Office 365 Excel page (office.com or excel.live.com)
- Check browser console (F12) for errors
- Verify Tampermonkey script is enabled

**Box tab says "Configuration incomplete":**
- Check console (F12)
- Review the missing tokens listed in console
- Update CONFIG in `BulkSerialMove_BoxTab.js` with actual IDs
- Save and reload Box page

**Fields not filling:**
- Verify element IDs are correct (use DevTools to double-check)
- Check that the form selectors haven't changed
- Confirm the page is fully loaded before starting

**Success message not detected:**
- Verify the success message text matches exactly (case-sensitive)
- Check if it appears in a popup window or as a page element
- Use browser DevTools to find the exact text

---

## Step 7: Run Full Batch

Once testing passes:

1. **Load your full STAGING sheet** with all serials to move
2. **Excel tab:** Click "Start Bulk Serial Move"
3. **Monitor progress:**
   - Both tabs will process items automatically
   - Console shows detailed logs (F12 → Console)
   - Each item takes ~5-10 seconds depending on page speed
4. **Review results:**
   - Successful items appear in PROCESSED sheet
   - Failed items appear in Serials2Check sheet

---

## Monitoring & Logs

### Check Console Logs

While running, open DevTools (F12) on either tab:

**Excel tab console shows:**
- `[BSM] Sent to Box tab: SN123456`
- `[BSM] Wrote to row X in target sheet`

**Box tab console shows:**
- `[BSM-BOX] Processing: SN123456 → Storage Bin A`
- `[BSM-BOX] Filled "boxNameInput" with: Storage Bin A`
- `[BSM-BOX] ✓ Serial submitted successfully on attempt 1`

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Nothing happens when clicking Start | Script not loaded on tab | Ensure Tampermonkey script is enabled; reload page |
| `Element not found` errors in console | Wrong element ID | Use DevTools to find correct ID and update CONFIG |
| Items get stuck/timeout | Page taking too long to respond | Increase `RETRY_WAIT_MS` in Box script (default 2000ms) |
| Same serial processed twice | Duplicate in STAGING sheet | Deduplicate input data before running |
| Script stops mid-batch | Browser tab crashed/closed | Check for page errors; restart from where it left off |

---

## Optimization Tips

### For Large Batches (1000+ items)

- **Increase retry timeout** if your form is slow:
  ```javascript
  RETRY_WAIT_MS: 3000,  // Increase from default 2000
  ```

- **Monitor performance:**
  - Average item takes ~5-10 seconds
  - 1000 items ≈ 2-3 hours
  - Leave browser window visible and computer on

### Data Preparation

- **Validate before running:**
  - No blank rows in STAGING
  - All serials in correct format
  - All box names valid in system

- **Keep a backup:**
  - Copy STAGING sheet before running
  - Easy rollback if needed

---

## When Something Goes Wrong

### Script Stops Mid-Batch

1. Check console for errors (F12 → Console)
2. Note which serial failed
3. **Option A:** Fix the issue and restart (will skip already-processed items)
4. **Option B:** Check Serials2Check sheet for failed items

### Page Reload Stuck

If Box page won't reload:
- Manually refresh the page
- Script will resume with next item in queue
- No items are reprocessed (they're already in Box)

### Need to Stop

- Close the Excel tab or click elsewhere
- Script stops monitoring for new items
- Items already processed remain in output sheets

---

## Questions?

If tokens aren't filling or the process differs from your system:

1. **Document the actual form behavior** in your Box interface
2. **Take screenshots** of the form and DevTools Inspector output
3. **Check the exact HTML structure** of your elements
4. Adjust element IDs in CONFIG to match your environment

---

## Next Steps

Once the setup is complete:

1. ✓ Keep both scripts enabled in Tampermonkey
2. ✓ Anytime you need a bulk move, prepare STAGING sheet
3. ✓ Click "Start Bulk Serial Move" button
4. ✓ Review results in PROCESSED and Serials2Check sheets
5. ✓ Archive/backup successful moves
