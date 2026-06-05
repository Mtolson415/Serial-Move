# Shortcut Script Fixes - What Changed

The improved script handles all the SPA (Single Page Application) edge cases your original script was hitting.

---

## Problems Fixed

### 1. **Alt+S (Serial) Not Working**

**Original Problem:**
- Script looked for `getElementById('SerialNumber')` on page load
- If that element didn't exist yet, it failed permanently
- No retry or fallback logic

**Fix:**
- Script now tries **multiple selectors** to find the element:
  - By ID: `SerialNumber`, `serial`, `serialNumber`, `serial-input`, `partSerial`
  - By name attribute: `name="SerialNumber"`, etc.
  - By class/data attributes: `.serial-input`, `[data-field="serial"]`, etc.
- Uses `waitForElement()` with retry logic if element appears after page load
- Properly triggers input events (`focus`, `input`, `change`) that Angular/React listen for

### 2. **Alt+M & Alt+C Only Work Once**

**Original Problem:**
- After pressing Alt+M once, the form updates and replaces that DOM element
- The script's reference to the old element is now invalid
- Second press tries to focus/click a non-existent element
- No mechanism to detect the element was replaced

**Fix:**
- **No cached references** — every keystroke calls `findElement()` fresh
- Searches for the element in real-time from the current DOM
- If the page replaced the element, the new one is found automatically
- Mutation Observer watches for DOM changes (good for debugging)
- Works unlimited times, not just once

### 3. **Form Events Not Triggering**

**Original Problem:**
- Just calling `.focus()` or `.click()` isn't enough for Angular/Vue/React
- Modern frameworks expect proper event dispatching
- Some events only trigger on the correct phases

**Fix:**
- Dispatches multiple events that frameworks listen for:
  ```javascript
  element.dispatchEvent(new Event('focus', { bubbles: true }));
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  ```
- Uses `addEventListener` with **capture phase** (`true` as third argument)
- Ensures keydown events are caught before the form's own handlers

---

## Key Improvements

### Robust Element Selection

Instead of just checking one ID:
```javascript
// OLD - Fails if SerialNumber doesn't exist
const serialInput = document.getElementById('SerialNumber');

// NEW - Tries many ways to find the element
function findElement(fieldName) {
  // Try IDs, names, classes, data attributes
  // Returns first match found
}
```

### Async/Await for Dynamic Elements

```javascript
async function handleSerial() {
  // Waits up to 5 seconds for element to appear
  const element = await waitForElement('SERIAL', 5000);
  if (!element) return; // Gracefully handles timeout
  // Use element...
}
```

### Event Simulation

```javascript
// Clear the field properly
element.value = '';
element.focus();
element.select();

// Tell the framework the input changed
element.dispatchEvent(new Event('focus', { bubbles: true }));
element.dispatchEvent(new Event('input', { bubbles: true }));
element.dispatchEvent(new Event('change', { bubbles: true }));
```

### Smart Save Button Checking

```javascript
// Check multiple disable states
if (element.hasAttribute('disabled')) return; // Standard HTML
if (element.getAttribute('aria-disabled') === 'true') return; // Accessibility
if (element.getAttribute('ng-disabled') === 'true') return; // Angular
```

---

## How to Use

1. **Open Tampermonkey**
2. **Create new script** or edit your existing one
3. **Replace all code** with `Userscript_FIXED.js` contents
4. **Save** (Ctrl+S)
5. **Reload** the Part Recovery page

---

## Testing

### Test Alt+S (Serial)

1. Open Part Recovery page
2. Press **Alt+S**
3. Look at browser console (F12):
   - Should see `[SPR] Serial input focused and cleared`
   - Or specific message showing which selector found it
4. Serial input should be focused and ready to type

### Test Alt+M and Alt+C Multiple Times

1. Press **Alt+M** → type something → submit
2. Page updates (item moves to next one)
3. Press **Alt+M** again on new item
4. Should still work (not just the first time)

### Test Ctrl+S

1. Fill in form
2. Press **Ctrl+S**
3. Should click save button even if form is still loading

---

## If Something Still Doesn't Work

The script logs everything to the browser console. Use **F12 → Console tab** to see:

```
[SPR] Alt+M pressed - finding MPN input
[SPR] Found MPN by ID: #MPN
[SPR] MPN input focused and cleared
```

### Common Issues

**See "element not found" in console:**
- The element ID/name/class is different in your form
- Open DevTools (F12) on the form
- Right-click the field → Inspect
- Find the actual `id=`, `name=`, or `class=` value
- Add it to the `SELECTORS` object in the script

**Shortcut triggers but nothing happens:**
- The form might have its own keydown handler that prevents bubbling
- Try pressing the shortcut twice (sometimes needed if framework is busy)
- Check console for error messages

**Field focuses but doesn't clear:**
- Some frameworks override `.value = ''`
- Script tries to trigger events; if those don't work, you may need to simulate additional keypresses

---

## Customization

If you need to adjust element selectors, edit the `SELECTORS` object:

```javascript
const SELECTORS = {
    MPN: {
        ids: ['MPN', 'mpn', 'mpnInput', 'barcode-mpn'], // Add yours here
        names: ['MPN', 'mpn'],
        classes: ['.mpn-input', '[data-field="mpn"]']
    },
    // ... etc
};
```

Add any ID/name/class your form uses and it will be tried automatically.

---

## Why This Works Better

| Problem | Original Fix | New Fix |
|---------|--------------|---------|
| Serial not found | Fails permanently | Retries with multiple selectors |
| Shortcuts only work once | Reuses stale element ref | Finds element fresh each time |
| Form doesn't respond | Just calls `.focus()` | Dispatches full event chain |
| Elements missing on load | Fails immediately | Waits up to 5 seconds |
| Different element IDs | Hardcoded fail | Tries 10+ selector combos |

---

## Console Logging

To see detailed logs of what's happening:

1. Press **F12** on the Part Recovery page
2. Go to **Console** tab
3. Press a shortcut key
4. Watch the `[SPR]` messages appear

Disable logging noise by commenting out this line (or leaving it as-is):
```javascript
// console.log('[SPR] DOM updated - form may have changed');
```

---

## Support

If the script still has issues:

1. **Copy the console output** when you press a shortcut
2. **Share the form's HTML** (right-click → Inspect → paste the element code)
3. **Tell me what you saw vs. what you expected**

I can then add more selectors or adjust the logic.
