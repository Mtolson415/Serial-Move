# Token Reference - What to Fill In

This file documents exactly what tokens you need to find and fill in.

---

## Excel Tab Script (`BulkSerialMove_ExcelTab.js`)

**Location:** Search for `const CONFIG = {` at the top of the script

### What to Check (Usually Correct as-is)

```javascript
const CONFIG = {
  STAGING_SHEET: 'STAGING',           // ← Your input sheet name
  PROCESSED_SHEET: 'PROCESSED',       // ← Your output sheet (successful items)
  SERIALS_CHECK_SHEET: 'Serials2Check', // ← Your output sheet (failed items)
  BOXNAME_COLUMN: 'BOXNAME',          // ← Your column header name
  SERIAL_COLUMN: 'SERIAL',            // ← Your column header name
};
```

**Action:** Verify these sheet and column names match your Excel workbook exactly.

---

## Box Tab Script (`BulkSerialMove_BoxTab.js`)

**Location:** Search for `const CONFIG = {` at the top of the script

### What to Fill In

You need to find **5 things** and fill them in:

#### 1. BOXNAME Input Field ID

```javascript
BOXNAME_INPUT_ID: 'TOKEN_BOXNAME_INPUT_ID',
```

**How to find it:**
1. Open Box form page
2. Right-click the "Box Name" text input field
3. Click "Inspect Element"
4. In DevTools, look for `<input id="..."`
5. Copy the `id` value

**Example:** If you see `<input type="text" id="boxNameField">`, fill in:
```javascript
BOXNAME_INPUT_ID: 'boxNameField',
```

---

#### 2. BOXNAME Send Button ID

```javascript
BOXNAME_SEND_BUTTON_ID: 'TOKEN_BOXNAME_SEND_BUTTON_ID',
```

**How to find it:**
1. Open Box form page
2. Right-click the button that submits/sends the box name
3. Click "Inspect Element"
4. In DevTools, look for `<button id="..."`
5. Copy the `id` value

**Example:** If you see `<button id="submitBoxBtn">`, fill in:
```javascript
BOXNAME_SEND_BUTTON_ID: 'submitBoxBtn',
```

---

#### 3. SERIAL Input Field ID

```javascript
SERIAL_INPUT_ID: 'TOKEN_SERIAL_INPUT_ID',
```

**How to find it:**
1. Open Box form page
2. Right-click the "Serial Number" text input field
3. Click "Inspect Element"
4. In DevTools, look for `<input id="..."`
5. Copy the `id` value

**Example:** If you see `<input type="text" id="serialInput">`, fill in:
```javascript
SERIAL_INPUT_ID: 'serialInput',
```

---

#### 4. SERIAL Send Button ID

```javascript
SERIAL_SEND_BUTTON_ID: 'TOKEN_SERIAL_SEND_BUTTON_ID',
```

**How to find it:**
1. Open Box form page
2. Right-click the button that submits/sends the serial number
3. Click "Inspect Element"
4. In DevTools, look for `<button id="..."`
5. Copy the `id` value

**Example:** If you see `<button id="confirmSerial">`, fill in:
```javascript
SERIAL_SEND_BUTTON_ID: 'confirmSerial',
```

---

#### 5. Success Message Text

```javascript
SUCCESS_MESSAGE_TEXT: 'TOKEN_SUCCESS_MESSAGE_TEXT',
```

**How to find it:**
1. Manually move one item through the form as a test
2. After submitting the serial, a success message appears
3. Read the exact text of that message
4. Copy it exactly (case-sensitive!)

**Example:** If you see a popup that says "Item successfully moved to Storage", fill in:
```javascript
SUCCESS_MESSAGE_TEXT: 'Item successfully moved to Storage',
```

---

## Quick Checklist

Before running, verify you've filled in:

- [ ] Excel sheet names (`STAGING_SHEET`, `PROCESSED_SHEET`, `SERIALS_CHECK_SHEET`)
- [ ] Excel column names (`BOXNAME_COLUMN`, `SERIAL_COLUMN`)
- [ ] Box form field IDs (all 4 input/button IDs)
- [ ] Success message text (exact copy from popup/message)

---

## How to Use DevTools to Find IDs

### Quick Method

1. Press `F12` on your keyboard (opens DevTools)
2. Click the **Inspector icon** (top-left of DevTools)
3. Hover over the element you want to inspect
4. Click on it
5. In the HTML panel, you'll see something like:
   ```html
   <input type="text" id="myFieldName">
   ```
6. The `id="..."` part is what you need

### Finding the ID Directly

You can also search for it:

1. Press `Ctrl+Shift+C` (or `Cmd+Shift+C` on Mac)
2. A picker appears
3. Click the element you want to inspect
4. The HTML will highlight and show you the ID

---

## Example Configuration

Here's what a completed configuration might look like:

```javascript
const CONFIG = {
  // Element IDs
  BOXNAME_INPUT_ID: 'boxNameField',           // Found in Box form
  BOXNAME_SEND_BUTTON_ID: 'sendBoxNameBtn',   // Found in Box form
  SERIAL_INPUT_ID: 'serialNumberField',       // Found in Box form
  SERIAL_SEND_BUTTON_ID: 'moveItemBtn',       // Found in Box form

  // Success indicator
  SUCCESS_MESSAGE_TEXT: 'Item successfully moved',

  // Rest of config (do not change)
  SERIAL_INPUT_CHECK_SELECTOR: null,
  RETRY_WAIT_MS: 2000,
  MAX_RETRIES: 3,
  // ... etc
};
```

---

## Testing Your Tokens

Once you fill in the tokens:

1. **Save the script** in Tampermonkey (Ctrl+S)
2. **Reload the Box form page** (F5)
3. **Open console** (F12 → Console tab)
4. Look for a message:
   - ✓ `[BSM-BOX] ✓ Configuration complete` — All tokens found!
   - ✗ `[BSM-BOX] ⚠️ CONFIGURATION INCOMPLETE` — Some tokens are still wrong

If you see errors, double-check your token values against the actual form elements.

---

## Can't Find the Element ID?

Some forms don't use standard ID attributes. If you can't find an `id`:

1. Check for `name` attribute instead: `<input name="boxName">`
2. Check for `class` attribute: `<input class="form-field"`
3. **Contact support** if the form structure is unusual

In these cases, you may need to modify the script to use CSS selectors like `.className` instead of IDs.
