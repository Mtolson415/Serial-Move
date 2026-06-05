// ============================================================================
// BULK SERIAL MOVE - EXCEL TAB SCRIPT
// Tampermonkey script for Office 365 Excel tab
// ============================================================================
// This script reads from the STAGING sheet and coordinates with the Box tab
// to process serial moves. Install this script on the Excel tab.
// ============================================================================

// ============================================================================
// CONFIGURATION - FILL IN THESE TOKENS
// ============================================================================

const CONFIG = {
  // Sheet names (match your Excel workbook exactly)
  STAGING_SHEET: 'STAGING',
  PROCESSED_SHEET: 'PROCESSED',
  SERIALS_CHECK_SHEET: 'Serials2Check',

  // Column names (match your Excel headers exactly)
  BOXNAME_COLUMN: 'BOXNAME',
  SERIAL_COLUMN: 'SERIAL',

  // Cross-tab communication (do not modify)
  STORAGE_KEY: 'bulkSerialMove_queue',
  RESULT_KEY: 'bulkSerialMove_result',
  STATUS_KEY: 'bulkSerialMove_status'
};

// ============================================================================
// MAIN SCRIPT
// ============================================================================

(function() {
  'use strict';

  // Only run on Office 365 Excel pages
  if (!window.location.hostname.includes('office.com') &&
      !window.location.hostname.includes('excel.live.com')) {
    console.log('[BSM] Not an Excel page, script inactive');
    return;
  }

  console.log('[BSM] Excel tab script loaded');

  // Global state
  let currentRowIndex = 2; // Start at row 2 (after header)
  let isProcessing = false;
  let stagingSheet = null;
  let processedSheet = null;
  let serialsCheckSheet = null;

  // ============================================================================
  // WAIT FOR EXCEL TO BE READY
  // ============================================================================

  function waitForExcel() {
    return new Promise((resolve) => {
      const checkExcel = () => {
        if (window.Excel && window.Excel.onReady) {
          resolve();
        } else {
          setTimeout(checkExcel, 500);
        }
      };
      checkExcel();
    });
  }

  // ============================================================================
  // INITIALIZE SHEETS
  // ============================================================================

  function initializeSheets() {
    return new Promise((resolve, reject) => {
      Excel.run(async (context) => {
        try {
          const workbook = context.application.workbook;

          // Get sheets
          stagingSheet = workbook.worksheets.getItem(CONFIG.STAGING_SHEET);
          processedSheet = workbook.worksheets.getItem(CONFIG.PROCESSED_SHEET);
          serialsCheckSheet = workbook.worksheets.getItem(CONFIG.SERIALS_CHECK_SHEET);

          // Load sheet names to verify they exist
          stagingSheet.load('name');
          processedSheet.load('name');
          serialsCheckSheet.load('name');

          await context.sync();
          console.log('[BSM] Sheets initialized');
          resolve();
        } catch (error) {
          console.error('[BSM] Sheet initialization failed:', error);
          reject(error);
        }
      });
    });
  }

  // ============================================================================
  // GET COLUMN INDEX BY NAME
  // ============================================================================

  function getColumnIndexByName(sheet, columnName) {
    return new Promise((resolve, reject) => {
      Excel.run(async (context) => {
        try {
          const headerRange = sheet.getRange('1:1');
          headerRange.load('values');
          await context.sync();

          const headerValues = headerRange.values[0];
          const columnIndex = headerValues.indexOf(columnName);

          if (columnIndex === -1) {
            reject(new Error(`Column "${columnName}" not found in header`));
          } else {
            resolve(columnIndex);
          }
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  // ============================================================================
  // READ NEXT ROW FROM STAGING
  // ============================================================================

  function readNextRow(boxnameColIndex, serialColIndex) {
    return new Promise((resolve, reject) => {
      Excel.run(async (context) => {
        try {
          const range = stagingSheet.getRange(`${currentRowIndex}:${currentRowIndex}`);
          range.load('values');
          await context.sync();

          const rowData = range.values[0];

          // Check if row is empty
          if (!rowData || rowData.every(cell => !cell)) {
            resolve(null); // End of data
            return;
          }

          const boxname = rowData[boxnameColIndex] || '';
          const serial = rowData[serialColIndex] || '';

          resolve({
            rowIndex: currentRowIndex,
            boxname: boxname.toString().trim(),
            serial: serial.toString().trim()
          });
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  // ============================================================================
  // WRITE RESULT TO SHEET
  // ============================================================================

  function writeResultToSheet(targetSheet, rowData) {
    return new Promise((resolve, reject) => {
      Excel.run(async (context) => {
        try {
          const lastRow = targetSheet.getUsedRange().getLastRow();
          lastRow.load('rowIndex');
          await context.sync();

          const insertRow = lastRow.rowIndex + 2; // +2 to get next empty row
          const insertRange = targetSheet.getRange(`${insertRow}:${insertRow}`);

          // Insert the row data
          insertRange.values = [[rowData.boxname, rowData.serial]];

          await context.sync();
          console.log(`[BSM] Wrote to row ${insertRow} in target sheet`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  // ============================================================================
  // SEND ITEM TO BOX TAB FOR PROCESSING
  // ============================================================================

  function sendToBoxTab(rowData) {
    return new Promise((resolve, reject) => {
      // Store item in localStorage for Box tab
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(rowData));

      console.log(`[BSM] Sent to Box tab: ${rowData.serial}`);

      // Wait for result from Box tab (max 5 minute timeout per item)
      const maxWaitTime = 5 * 60 * 1000;
      const pollInterval = 1000;
      const startTime = Date.now();

      const pollResult = () => {
        const result = localStorage.getItem(CONFIG.RESULT_KEY);

        if (result) {
          localStorage.removeItem(CONFIG.RESULT_KEY); // Clear after reading
          resolve(JSON.parse(result));
        } else if (Date.now() - startTime > maxWaitTime) {
          reject(new Error('Box tab response timeout'));
        } else {
          setTimeout(pollResult, pollInterval);
        }
      };

      pollResult();
    });
  }

  // ============================================================================
  // MAIN PROCESSING LOOP
  // ============================================================================

  async function processAllRows() {
    try {
      // Get column indices
      const boxnameColIndex = await getColumnIndexByName(stagingSheet, CONFIG.BOXNAME_COLUMN);
      const serialColIndex = await getColumnIndexByName(stagingSheet, CONFIG.SERIAL_COLUMN);

      console.log(`[BSM] BOXNAME column: ${boxnameColIndex + 1}, SERIAL column: ${serialColIndex + 1}`);

      isProcessing = true;
      let processedCount = 0;
      let failedCount = 0;

      while (true) {
        try {
          // Read next row
          const rowData = await readNextRow(boxnameColIndex, serialColIndex);

          if (!rowData) {
            console.log('[BSM] All rows processed');
            break;
          }

          // Skip if either field is empty
          if (!rowData.boxname || !rowData.serial) {
            console.log(`[BSM] Skipping row ${rowData.rowIndex} - missing BOXNAME or SERIAL`);
            currentRowIndex++;
            continue;
          }

          console.log(`[BSM] Processing row ${rowData.rowIndex}: ${rowData.serial} → ${rowData.boxname}`);

          // Send to Box tab and wait for result
          const result = await sendToBoxTab(rowData);

          // Write to appropriate output sheet
          if (result.success) {
            await writeResultToSheet(processedSheet, rowData);
            console.log(`[BSM] ✓ Moved to PROCESSED sheet`);
            processedCount++;
          } else {
            await writeResultToSheet(serialsCheckSheet, rowData);
            console.log(`[BSM] ✗ Moved to Serials2Check sheet: ${result.reason}`);
            failedCount++;
          }

          currentRowIndex++;

        } catch (error) {
          console.error(`[BSM] Error processing row ${currentRowIndex}:`, error);
          failedCount++;
          currentRowIndex++;
          // Continue to next row on error
        }
      }

      isProcessing = false;
      console.log(`[BSM] COMPLETE - Processed: ${processedCount}, Failed: ${failedCount}`);
      alert(`Bulk Serial Move Complete!\n\nProcessed: ${processedCount}\nFailed: ${failedCount}`);

    } catch (error) {
      console.error('[BSM] Fatal error:', error);
      alert(`Error: ${error.message}`);
      isProcessing = false;
    }
  }

  // ============================================================================
  // CREATE START BUTTON
  // ============================================================================

  function createStartButton() {
    const button = document.createElement('button');
    button.textContent = 'Start Bulk Serial Move';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background-color: #0078d4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      z-index: 10000;
      font-size: 14px;
    `;

    button.onclick = async () => {
      if (isProcessing) {
        alert('Already processing...');
        return;
      }

      const confirmed = confirm(
        'Start processing all rows in STAGING sheet?\n\n' +
        'Successful moves will go to PROCESSED sheet.\n' +
        'Failed items will go to Serials2Check sheet.'
      );

      if (confirmed) {
        button.disabled = true;
        button.textContent = 'Processing...';
        await processAllRows();
        button.disabled = false;
        button.textContent = 'Start Bulk Serial Move';
      }
    };

    document.body.appendChild(button);
    console.log('[BSM] Start button created');
  }

  // ============================================================================
  // INITIALIZE
  // ============================================================================

  async function initialize() {
    try {
      await waitForExcel();
      await initializeSheets();
      createStartButton();
      console.log('[BSM] Ready to process');
    } catch (error) {
      console.error('[BSM] Initialization failed:', error);
      alert(`Initialization error: ${error.message}`);
    }
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
