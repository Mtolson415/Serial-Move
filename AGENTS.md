# Project working rules

Read README.md, docs/README.md, docs/PROJECT-REVIEW.md, and any existing CLAUDE.md before changing this project. Preserve existing constraints and user decisions.

Use containerized development/tests where supported. Explain runtime exceptions. Keep app, development, and agent-tool privileges separate. Never add privileged mode or Docker socket mounts as a general workaround.

Use synthetic data and test credentials. Do not operate real inventory systems, modify real resources, or deploy to AWS as part of a local review.

Maintain self-education READMEs explaining options, tradeoffs, setup, expected output, troubleshooting, and recovery. Record source/version/license and meaningful tests for reusable code and APIs. Separate proposals, source review, local execution, and live verification.
