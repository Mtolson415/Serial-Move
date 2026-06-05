// ==UserScript==
// @name         Shortcut Part Recovery (Fixed for SPA)
// @namespace    http://tampermonkey.net/
// @version      2026-06-05
// @description  alt + m > MPN, alt + s > Serial#, alt + c > CoO, ctrl + s > save button. Fixed for dynamic SPA updates.
// @author       Michael Tolson
// @match        https://rrldispo.eviridis.com/recovery/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('[SPR] Shortcut Part Recovery script loaded');

    // ============================================================================
    // CONFIGURATION
    // ============================================================================

    const SELECTORS = {
        MPN: {
            ids: ['MPN', 'mpn', 'mpnInput', 'barcode-mpn'],
            names: ['MPN', 'mpn'],
            classes: ['.mpn-input', '[data-field="mpn"]']
        },
        SERIAL: {
            ids: ['SerialNumber', 'serial', 'serialNumber', 'serial-input', 'partSerial'],
            names: ['SerialNumber', 'serial', 'serialNumber'],
            classes: ['.serial-input', '[data-field="serial"]', '[data-ng-model*="serial"]']
        },
        COO: {
            ids: ['COOID', 'coo', 'countryOfOrigin', 'coo-select'],
            names: ['COOID', 'coo', 'countryOfOrigin'],
            classes: ['.coo-select', '[data-field="coo"]']
        },
        SAVE: {
            ids: ['save_button', 'saveButton', 'save', 'submit-btn'],
            names: ['save', 'submit'],
            classes: ['.save-button', '[data-action="save"]', '[ng-click*="save"]']
        }
    };

    // ============================================================================
    // ELEMENT FINDER - Robust element selection
    // ============================================================================

    function findElement(fieldName) {
        const selectors = SELECTORS[fieldName];
        if (!selectors) {
            console.warn(`[SPR] Unknown field: ${fieldName}`);
            return null;
        }

        // Try by ID
        for (const id of selectors.ids) {
            const el = document.getElementById(id);
            if (el) {
                console.log(`[SPR] Found ${fieldName} by ID: #${id}`);
                return el;
            }
        }

        // Try by name attribute
        for (const name of selectors.names) {
            const el = document.querySelector(`input[name="${name}"], select[name="${name}"], textarea[name="${name}"]`);
            if (el) {
                console.log(`[SPR] Found ${fieldName} by name: ${name}`);
                return el;
            }
        }

        // Try by class/selector
        for (const selector of selectors.classes) {
            const el = document.querySelector(selector);
            if (el) {
                console.log(`[SPR] Found ${fieldName} by selector: ${selector}`);
                return el;
            }
        }

        console.warn(`[SPR] Could not find ${fieldName} element`);
        return null;
    }

    // ============================================================================
    // WAIT FOR ELEMENT - Retry logic for dynamic elements
    // ============================================================================

    function waitForElement(fieldName, maxWait = 5000) {
        return new Promise((resolve) => {
            const startTime = Date.now();

            const check = () => {
                const element = findElement(fieldName);

                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime > maxWait) {
                    console.warn(`[SPR] Timeout waiting for ${fieldName}`);
                    resolve(null);
                } else {
                    setTimeout(check, 100);
                }
            };

            check();
        });
    }

    // ============================================================================
    // ACTION HANDLERS
    // ============================================================================

    async function handleMPN() {
        console.log('[SPR] Alt+M pressed - finding MPN input');
        const element = await waitForElement('MPN');

        if (!element) {
            console.log('[SPR] MPN element not found');
            return;
        }

        // Clear and focus
        element.value = '';
        element.focus();
        element.select();

        // Trigger events to notify the form
        element.dispatchEvent(new Event('focus', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('[SPR] MPN input focused and cleared');
    }

    async function handleSerial() {
        console.log('[SPR] Alt+S pressed - finding Serial input');
        const element = await waitForElement('SERIAL');

        if (!element) {
            console.log('[SPR] Serial element not found');
            return;
        }

        // Clear and focus
        element.value = '';
        element.focus();
        element.select();

        // Trigger events to notify the form
        element.dispatchEvent(new Event('focus', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('[SPR] Serial input focused and cleared');
    }

    async function handleCOO() {
        console.log('[SPR] Alt+C pressed - finding COO dropdown');
        const element = await waitForElement('COO');

        if (!element) {
            console.log('[SPR] COO element not found');
            return;
        }

        // Different handling for select vs custom dropdown
        if (element.tagName === 'SELECT') {
            element.focus();
            element.click();
            console.log('[SPR] COO select opened');
        } else {
            // Custom dropdown or button
            element.focus();
            element.click();
            element.dispatchEvent(new Event('click', { bubbles: true }));
            console.log('[SPR] COO dropdown triggered');
        }
    }

    async function handleSave() {
        console.log('[SPR] Ctrl+S pressed - finding Save button');
        const element = await waitForElement('SAVE');

        if (!element) {
            console.log('[SPR] Save button not found');
            return;
        }

        // Check if disabled
        if (element.hasAttribute('disabled')) {
            console.log('[SPR] Save button is disabled');
            return;
        }

        // Check for Angular disabled state
        const ariaDisabled = element.getAttribute('aria-disabled');
        if (ariaDisabled === 'true') {
            console.log('[SPR] Save button is disabled (aria-disabled)');
            return;
        }

        // Check for ng-disabled
        if (element.getAttribute('ng-disabled') === 'true' ||
            element.getAttribute('data-ng-disabled-true') === 'true') {
            console.log('[SPR] Save button is disabled (ng-disabled)');
            return;
        }

        // Click the button
        element.click();
        element.dispatchEvent(new Event('click', { bubbles: true }));
        console.log('[SPR] Save button clicked');
    }

    // ============================================================================
    // KEYBOARD EVENT LISTENER
    // ============================================================================

    document.addEventListener('keydown', function(event) {
        // Alt + M (MPN)
        if (event.altKey && event.key.toLowerCase() === 'm') {
            event.preventDefault();
            event.stopPropagation();
            handleMPN();
            return;
        }

        // Alt + S (Serial)
        if (event.altKey && event.key.toLowerCase() === 's') {
            event.preventDefault();
            event.stopPropagation();
            handleSerial();
            return;
        }

        // Alt + C (COO)
        if (event.altKey && event.key.toLowerCase() === 'c') {
            event.preventDefault();
            event.stopPropagation();
            handleCOO();
            return;
        }

        // Ctrl + S / Cmd + S (Save)
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            event.stopPropagation();
            handleSave();
            return;
        }
    }, true); // Capture phase ensures it catches before other handlers

    // ============================================================================
    // MUTATION OBSERVER - Watch for DOM changes and log when forms update
    // ============================================================================

    function setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            // Log significant DOM changes (optional - helps with debugging)
            // Uncomment to see when the form updates:
            // console.log('[SPR] DOM updated - form may have changed');
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });

        console.log('[SPR] Mutation observer active - monitoring DOM changes');
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    function initialize() {
        console.log('[SPR] Initializing keyboard shortcuts');
        setupMutationObserver();
        console.log('[SPR] Ready:');
        console.log('  Alt+M  → Focus MPN input');
        console.log('  Alt+S  → Focus Serial input');
        console.log('  Alt+C  → Open COO dropdown');
        console.log('  Ctrl+S → Click Save button');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
