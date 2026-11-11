# Project review and handoff

Reviewed 2026-11-10. Source inspection only; no real target system or AWS account was changed.

## Current state
Existing JavaScript browser scripts and a Python/Playwright v2 implementation with placeholder configuration; no automated tests or root README were present.

## Findings and decisions to resolve
- The original two-tab scripts use localStorage. Different web origins do not share localStorage; verify actual origin assumptions before relying on the documented cross-tab messaging.
- The Python variant uses a persistent browser profile and workbook writes; isolate test profiles and preserve source workbooks.
- Dependency ranges are unpinned, and target selectors remain configuration placeholders.
- Retries must distinguish a failed submission from a successful submission whose confirmation was lost; avoid duplicate moves.
- Tampermonkey runs in a browser; containerize tests or a supported runner rather than assuming the userscript itself becomes a standalone service.

## Completion sequence
1. Choose the supported variant and define a synthetic demo site/workbook.
2. Add dry-run, duplicate handling, confirmation, and recovery requirements.
3. Build offline fixtures and meaningful tests before connecting to a real target.
4. Evaluate browser-container login/accessibility and workbook persistence.

## Shared engineering structure
Use Docker for reproducible development/tests and applicable runtime services; document host/browser/managed-cloud exceptions. Keep application, development, and MCP access separate. Maintain root README, docs/README.md, source/license/component records, acceptance evidence, and recovery guidance. Use official version-matched examples and SDKs; record tested versions and never label source inspection as local verification.

## Acceptance evidence
Record exact command, environment/image identity, date, assertions, results, limitations, and mocked versus live execution. No new implementation has been verified in this review.
