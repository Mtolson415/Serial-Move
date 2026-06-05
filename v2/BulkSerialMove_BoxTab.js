// ============================================================================
// BULK SERIAL MOVE - BOX TAB SCRIPT
// Tampermonkey script for Box asset management web interface
// ============================================================================
// This script fills out the form fields and processes serial moves.
// Install this script on the Box tab in your Firefox container.
// ============================================================================

// ============================================================================
// CONFIGURATION - FILL IN THESE TOKENS WITH YOUR ELEMENT IDs
// ============================================================================

const CONFIG = {
  // Element IDs - FILL THESE IN by inspecting the form with DevTools
  BOXNAME_INPUT_ID: 'TOKEN_BOXNAME_INPUT_ID',
  BOXNAME_SEND_BUTTON_ID: 'TOKEN_BOXNAME_SEND_BUTTON_ID',
  SERIAL_INPUT_ID: 'TOKEN_SERIAL_INPUT_ID',
  SERIAL_SEND_BUTTON_ID: 'TOKEN_SERIAL_SEND_BUTTON_ID',

  // Success indicator - text that appears in success popup/message
  SUCCESS_MESSAGE_TEXT: 'TOKEN_SUCCESS_MESSAGE_TEXT',

  // Optional: CSS selector to check if serial input has a value
  // Leave as null to check .value property instead
  SERIAL_INPUT_CHECK_SELECTOR: null,

  // Retry settings
  RETRY_WAIT_MS: 2000,
  MAX_RETRIES: 3,

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

  console.log('[BSM-BOX] Box tab script loaded');

  let currentItem = null;
  let isProcessing = false;

  // ============================================================================
  // WAIT FOR ELEMENT
  // ============================================================================

  function waitForElement(selector, maxWait = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkElement = () => {
        const element = document.querySelector(selector);

        if (element) {
          resolve(element);
        } else if (Date.now() - startTime > maxWait) {
          reject(new Error(`Element not found: ${selector}`));
        } else {
          setTimeout(checkElement, 100);
        }
      };

      checkElement();
    });
  }

  // ============================================================================
  // FILL INPUT FIELD
  // ============================================================================

  function fillInput(selector, value) {
    return new Promise((resolve, reject) => {
      try {
        const element = document.querySelector(selector);

        if (!element) {
          reject(new Error(`Input element not found: ${selector}`));
          return;
        }

        // Focus the input
        element.focus();

        // Clear existing value
        element.value = '';
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));

        // Set new value
        element.value = value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));

        console.log(`[BSM-BOX] Filled "${selector}" with: ${value}`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================================================
  // CLICK BUTTON
  // ============================================================================

  function clickButton(selector) {
    return new Promise((resolve, reject) => {
      try {
        const button = document.querySelector(selector);

        if (!button) {
          reject(new Error(`Button not found: ${selector}`));
          return;
        }

        button.click();
        console.log(`[BSM-BOX] Clicked button: ${selector}`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================================================
  // CHECK IF SERIAL INPUT IS POPULATED
  // ============================================================================

  function isSerialInputPopulated() {
    const element = document.querySelector(`#${CONFIG.SERIAL_INPUT_ID}`);

    if (!element) {
      console.warn('[BSM-BOX] Serial input element not found');
      return false;
    }

    if (CONFIG.SERIAL_INPUT_CHECK_SELECTOR) {
      // Use custom selector
      return !!document.querySelector(CONFIG.SERIAL_INPUT_CHECK_SELECTOR);
    }

    // Check .value property
    return element.value && element.value.trim() !== '';
  }

  // ============================================================================
  // CHECK FOR SUCCESS MESSAGE
  // ============================================================================

  function checkForSuccessMessage() {
    const bodyText = document.body.innerText;
    return bodyText.includes(CONFIG.SUCCESS_MESSAGE_TEXT);
  }

  // ============================================================================
  // WAIT FOR SUCCESS MESSAGE
  // ============================================================================

  function waitForSuccessMessage(maxWait = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkMessage = () => {
        if (checkForSuccessMessage()) {
          resolve(true);
        } else if (Date.now() - startTime > maxWait) {
          reject(new Error('Success message not found within timeout'));
        } else {
          setTimeout(checkMessage, 100);
        }
      };

      checkMessage();
    });
  }

  // ============================================================================
  // FILL BOXNAME FIELD AND SUBMIT
  // ============================================================================

  async function fillBoxName(boxname) {
    try {
      console.log(`[BSM-BOX] Filling BOXNAME: ${boxname}`);

      // Fill the input
      await fillInput(`#${CONFIG.BOXNAME_INPUT_ID}`, boxname);

      // Small delay before clicking
      await new Promise(r => setTimeout(r, 300));

      // Click send button
      await clickButton(`#${CONFIG.BOXNAME_SEND_BUTTON_ID}`);

      // Wait for form to process
      await new Promise(r => setTimeout(r, 1000));

      console.log('[BSM-BOX] BOXNAME submitted');
    } catch (error) {
      throw new Error(`Failed to fill BOXNAME: ${error.message}`);
    }
  }

  // ============================================================================
  // FILL SERIAL FIELD AND SUBMIT WITH RETRY
  // ============================================================================

  async function fillSerialWithRetry(serial) {
    console.log(`[BSM-BOX] Filling SERIAL: ${serial}`);

    for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
      try {
        // Check if SERIALNUM field is empty
        if (!isSerialInputPopulated()) {
          console.log('[BSM-BOX] SERIALNUM field is empty, filling it');
          await fillInput(`#${CONFIG.SERIAL_INPUT_ID}`, serial);
        } else {
          console.log('[BSM-BOX] SERIALNUM field already populated');
        }

        // Small delay before clicking
        await new Promise(r => setTimeout(r, 300));

        // Click send button
        await clickButton(`#${CONFIG.SERIAL_SEND_BUTTON_ID}`);

        // Wait for success message
        await waitForSuccessMessage(5000);

        console.log(`[BSM-BOX] ✓ Serial submitted successfully on attempt ${attempt}`);
        return { success: true };

      } catch (error) {
        console.log(`[BSM-BOX] Attempt ${attempt} failed: ${error.message}`);

        if (attempt < CONFIG.MAX_RETRIES) {
          console.log(`[BSM-BOX] Waiting ${CONFIG.RETRY_WAIT_MS}ms before retry...`);
          await new Promise(r => setTimeout(r, CONFIG.RETRY_WAIT_MS));
        }
      }
    }

    // All retries exhausted
    console.log('[BSM-BOX] ✗ Serial submission failed after all retries');
    return {
      success: false,
      reason: 'Max retries exceeded - serial likely still in system'
    };
  }

  // ============================================================================
  // RELOAD BOX TRANSFER PAGE
  // ============================================================================

  async function reloadPage() {
    console.log('[BSM-BOX] Reloading page to clear fields');
    location.reload();
    // Wait for page to reload
    await new Promise(r => setTimeout(r, 3000));
  }

  // ============================================================================
  // PROCESS ONE ITEM
  // ============================================================================

  async function processItem(item) {
    try {
      console.log(`[BSM-BOX] Processing: ${item.serial} → ${item.boxname}`);

      // Step 1: Fill BOXNAME
      await fillBoxName(item.boxname);

      // Step 2: Fill SERIAL with retry logic
      const result = await fillSerialWithRetry(item.serial);

      // Step 3: Reload page for next item
      await reloadPage();

      // Return result to Excel tab
      localStorage.setItem(CONFIG.RESULT_KEY, JSON.stringify(result));
      console.log('[BSM-BOX] Result sent to Excel tab');

    } catch (error) {
      console.error('[BSM-BOX] Error processing item:', error);

      // Return error result
      localStorage.setItem(CONFIG.RESULT_KEY, JSON.stringify({
        success: false,
        reason: `Error: ${error.message}`
      }));
    }
  }

  // ============================================================================
  // MONITOR FOR INCOMING WORK
  // ============================================================================

  function monitorQueue() {
    setInterval(() => {
      const queueData = localStorage.getItem(CONFIG.STORAGE_KEY);

      if (queueData && !isProcessing) {
        try {
          const item = JSON.parse(queueData);
          currentItem = item;
          isProcessing = true;

          console.log('[BSM-BOX] Received item from queue');
          processItem(item).finally(() => {
            isProcessing = false;
          });

        } catch (error) {
          console.error('[BSM-BOX] Failed to parse queue data:', error);
        }
      }
    }, 500);
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  function initialize() {
    console.log('[BSM-BOX] Initializing...');

    // Validate configuration
    const missingTokens = [];

    if (CONFIG.BOXNAME_INPUT_ID.includes('TOKEN')) {
      missingTokens.push('BOXNAME_INPUT_ID');
    }
    if (CONFIG.BOXNAME_SEND_BUTTON_ID.includes('TOKEN')) {
      missingTokens.push('BOXNAME_SEND_BUTTON_ID');
    }
    if (CONFIG.SERIAL_INPUT_ID.includes('TOKEN')) {
      missingTokens.push('SERIAL_INPUT_ID');
    }
    if (CONFIG.SERIAL_SEND_BUTTON_ID.includes('TOKEN')) {
      missingTokens.push('SERIAL_SEND_BUTTON_ID');
    }
    if (CONFIG.SUCCESS_MESSAGE_TEXT.includes('TOKEN')) {
      missingTokens.push('SUCCESS_MESSAGE_TEXT');
    }

    if (missingTokens.length > 0) {
      console.warn('[BSM-BOX] ⚠️  CONFIGURATION INCOMPLETE - Fill in these tokens:');
      missingTokens.forEach(token => {
        console.warn(`   - CONFIG.${token}`);
      });
      console.warn('[BSM-BOX] Script will not process items until tokens are filled in');
    } else {
      console.log('[BSM-BOX] ✓ Configuration complete');
    }

    // Start monitoring for incoming work
    monitorQueue();
    console.log('[BSM-BOX] Ready - waiting for items from Excel tab');
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
