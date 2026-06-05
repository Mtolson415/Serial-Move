"""
Bulk Serial Move
Reads (BOXNAME, SERIAL) rows from a local .xlsx STAGING sheet,
drives the Box asset-management site via Playwright, and writes
results to PROCESSED or Serials2Check.

SETUP
-----
1. pip install playwright openpyxl
2. playwright install chromium
3. Fill in CONFIG below with your values (use DevTools Inspect to find IDs).
4. Run once with HEADLESS = False and LOG IN to the Box site by hand.
   Playwright saves the session in PROFILE_DIR and reuses it on every
   subsequent run — you only have to log in once (until your session expires).
5. python bulk_serial_move.py
"""

import asyncio
import time
from pathlib import Path

from openpyxl import load_workbook
from playwright.async_api import async_playwright, TimeoutError as PWTimeout

# ==============================================================================
# CONFIGURATION — fill these in
# ==============================================================================

CONFIG = {
    # --- File paths ---
    "WORKBOOK_PATH": r"C:\path\to\your\workbook.xlsx",   # local .xlsx file
    "PROFILE_DIR":   r"C:\path\to\browser_profile",      # persistent login cache

    # --- Sheet / column names (match your workbook exactly) ---
    "STAGING_SHEET":        "STAGING",
    "PROCESSED_SHEET":      "PROCESSED",
    "SERIALS_CHECK_SHEET":  "Serials2Check",
    "BOXNAME_COLUMN":       "BOXNAME",
    "SERIAL_COLUMN":        "SERIAL",

    # --- Box site ---
    "BOX_URL": "https://your-box-site.example.com/transfer",  # URL of the form page

    # --- Element IDs on the Box form (inspect with DevTools → copy id="…") ---
    "BOXNAME_INPUT_ID":       "TOKEN_BOXNAME_INPUT_ID",
    "BOXNAME_SEND_BUTTON_ID": "TOKEN_BOXNAME_SEND_BUTTON_ID",
    "SERIAL_INPUT_ID":        "TOKEN_SERIAL_INPUT_ID",
    "SERIAL_SEND_BUTTON_ID":  "TOKEN_SERIAL_SEND_BUTTON_ID",

    # --- Success detection ---
    # Text that appears somewhere on the page after a successful serial move
    "SUCCESS_MESSAGE_TEXT": "TOKEN_SUCCESS_MESSAGE_TEXT",

    # --- Retry / timing ---
    "MAX_RETRIES":    3,
    "RETRY_WAIT_S":   2,
    "SUCCESS_WAIT_S": 10,   # max seconds to wait for success message per attempt

    # --- Browser ---
    "HEADLESS": False,  # False = visible window (useful for first login & debugging)
}

# ==============================================================================
# VALIDATION
# ==============================================================================

def validate_config():
    tokens = [k for k, v in CONFIG.items() if isinstance(v, str) and "TOKEN" in v]
    if tokens:
        print("⚠  CONFIG incomplete — fill in these values before running:")
        for t in tokens:
            print(f"   CONFIG['{t}']")
        raise SystemExit(1)

# ==============================================================================
# SPREADSHEET HELPERS
# ==============================================================================

def load_staging_rows(wb):
    """Return list of (row_number, boxname, serial) from STAGING, skipping blanks."""
    ws = wb[CONFIG["STAGING_SHEET"]]
    headers = [cell.value for cell in ws[1]]

    try:
        box_col = headers.index(CONFIG["BOXNAME_COLUMN"])
        ser_col = headers.index(CONFIG["SERIAL_COLUMN"])
    except ValueError as e:
        raise SystemExit(f"Column not found in STAGING header: {e}")

    rows = []
    for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        boxname = str(row[box_col]).strip() if row[box_col] else ""
        serial  = str(row[ser_col]).strip() if row[ser_col] else ""
        if boxname and serial:
            rows.append((row_num, boxname, serial))
    return rows


def append_to_sheet(wb, sheet_name, boxname, serial):
    ws = wb[sheet_name]
    ws.append([boxname, serial])


def save_workbook(wb):
    wb.save(CONFIG["WORKBOOK_PATH"])

# ==============================================================================
# BROWSER HELPERS
# ==============================================================================

def sel(element_id):
    return f"#{element_id}"


async def fill_and_dispatch(page, selector, value):
    """Clear an input, type the value, and fire change/input events."""
    el = page.locator(selector)
    await el.wait_for(state="visible", timeout=10_000)
    await el.focus()
    await el.fill("")
    await el.fill(value)
    await page.evaluate(
        "(sel) => { const el = document.querySelector(sel); "
        "el.dispatchEvent(new Event('input',{bubbles:true})); "
        "el.dispatchEvent(new Event('change',{bubbles:true})); }",
        selector,
    )


async def wait_for_text(page, text, timeout_s):
    """Poll until page body contains text or timeout."""
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        if text in await page.inner_text("body"):
            return True
        await asyncio.sleep(0.2)
    return False


async def process_item(page, boxname, serial):
    """
    Fill BOXNAME, submit, fill SERIAL, submit, wait for success.
    Returns (success: bool, reason: str).
    Retries up to MAX_RETRIES times on the serial step.
    """
    # Step 1 — BOXNAME (done once per item, no retry needed)
    await fill_and_dispatch(page, sel(CONFIG["BOXNAME_INPUT_ID"]), boxname)
    await asyncio.sleep(0.3)
    await page.locator(sel(CONFIG["BOXNAME_SEND_BUTTON_ID"])).click()
    await asyncio.sleep(1.0)

    # Step 2 — SERIAL with retry
    for attempt in range(1, CONFIG["MAX_RETRIES"] + 1):
        try:
            await fill_and_dispatch(page, sel(CONFIG["SERIAL_INPUT_ID"]), serial)
            await asyncio.sleep(0.3)
            await page.locator(sel(CONFIG["SERIAL_SEND_BUTTON_ID"])).click()

            found = await wait_for_text(page, CONFIG["SUCCESS_MESSAGE_TEXT"], CONFIG["SUCCESS_WAIT_S"])
            if found:
                print(f"  ✓ success (attempt {attempt})")
                return True, ""

            print(f"  attempt {attempt}: success message not found")
        except PWTimeout as e:
            print(f"  attempt {attempt}: timeout — {e}")
        except Exception as e:
            print(f"  attempt {attempt}: error — {e}")

        if attempt < CONFIG["MAX_RETRIES"]:
            print(f"  waiting {CONFIG['RETRY_WAIT_S']}s before retry…")
            await asyncio.sleep(CONFIG["RETRY_WAIT_S"])

        # Reload for a clean form before next attempt
        await page.reload()
        await asyncio.sleep(1.5)
        # Re-fill BOXNAME after reload
        await fill_and_dispatch(page, sel(CONFIG["BOXNAME_INPUT_ID"]), boxname)
        await asyncio.sleep(0.3)
        await page.locator(sel(CONFIG["BOXNAME_SEND_BUTTON_ID"])).click()
        await asyncio.sleep(1.0)

    return False, "max retries exceeded — serial likely still in system"

# ==============================================================================
# MAIN
# ==============================================================================

async def run():
    validate_config()

    wb_path = Path(CONFIG["WORKBOOK_PATH"])
    if not wb_path.exists():
        raise SystemExit(f"Workbook not found: {wb_path}")

    wb = load_workbook(wb_path)
    for required in (CONFIG["STAGING_SHEET"], CONFIG["PROCESSED_SHEET"], CONFIG["SERIALS_CHECK_SHEET"]):
        if required not in wb.sheetnames:
            raise SystemExit(f"Sheet '{required}' not found in workbook")

    rows = load_staging_rows(wb)
    if not rows:
        print("STAGING sheet has no rows to process.")
        return

    print(f"Found {len(rows)} row(s) in STAGING.\n")

    processed = 0
    failed = 0

    profile_dir = Path(CONFIG["PROFILE_DIR"])
    profile_dir.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch_persistent_context(
            str(profile_dir),
            headless=CONFIG["HEADLESS"],
        )
        page = browser.pages[0] if browser.pages else await browser.new_page()

        print(f"Navigating to {CONFIG['BOX_URL']} …")
        await page.goto(CONFIG["BOX_URL"], wait_until="networkidle")

        for row_num, boxname, serial in rows:
            print(f"\nRow {row_num}: {serial} → {boxname}")
            success, reason = await process_item(page, boxname, serial)

            if success:
                append_to_sheet(wb, CONFIG["PROCESSED_SHEET"], boxname, serial)
                processed += 1
            else:
                append_to_sheet(wb, CONFIG["SERIALS_CHECK_SHEET"], boxname, serial)
                print(f"  ✗ failed: {reason}")
                failed += 1

            save_workbook(wb)  # save after each row so a crash doesn't lose progress

            # Brief pause between items
            await asyncio.sleep(0.5)

        await browser.close()

    print(f"\n{'='*50}")
    print(f"COMPLETE — Processed: {processed}  Failed: {failed}")
    print(f"{'='*50}")


if __name__ == "__main__":
    asyncio.run(run())
