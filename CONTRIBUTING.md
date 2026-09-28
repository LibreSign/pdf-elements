<!--
SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Contributing to @libresign/pdf-elements

Contributions are welcome. You do not need to work on a large feature to help: bug reports, reproduction cases, documentation, accessibility improvements, tests and focused code changes are all useful.

## Before you start

- Check the [open issues](https://github.com/LibreSign/pdf-elements/issues) to avoid duplicate work.
- For a substantial behavior or API change, open an issue first so the approach can be discussed before implementation.
- Keep pull requests focused on one problem whenever possible.

## Reporting bugs

Use the bug report template and include:

- a clear description of the problem;
- exact steps to reproduce it;
- expected and actual behavior;
- browser and operating-system information when relevant;
- a minimal reproduction or sample PDF when possible;
- screenshots or console output when they help explain the issue.

Please avoid attaching confidential or sensitive documents.

## Suggesting improvements

Feature requests are welcome. Describe the user problem first, then the proposed solution. Concrete use cases make requests easier to evaluate and implement.

Good contributions are not limited to new features. Improvements to documentation, test coverage, accessibility, performance and developer experience are also valuable.

## Development setup

1. Fork the repository.
2. Clone your fork:

   ```bash
   git clone https://github.com/YOUR-USERNAME/pdf-elements.git
   cd pdf-elements
   ```

3. Install dependencies:

   ```bash
   npm ci
   ```

4. Start the demo:

   ```bash
   npm run dev
   ```

5. Create a focused branch and make your changes.

## Validate your change

Run the checks relevant to your change before opening a pull request:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

For user-interface or browser behavior changes, also run:

```bash
npm run test:e2e
```

The CI executes linting, type checking, package validation, unit tests and Playwright coverage.

## Pull requests

A good pull request should:

- explain the problem being solved;
- describe the approach taken;
- include regression coverage for bug fixes when practical;
- update documentation when public behavior changes;
- include SPDX headers in new source files;
- keep unrelated refactors out of the same change.

Use meaningful Conventional Commit-style messages where possible, for example:

```
fix: keep element coordinates after zoom
feat: expose custom page footer slot
docs: add worker configuration example
test: cover cancelled element placement
```

## Coding standards

- Follow the existing Vue and TypeScript conventions in the repository.
- Use the repository ESLint configuration instead of manually formatting around lint rules.
- Add SPDX headers to new source files:

  ```text
  SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
  SPDX-License-Identifier: AGPL-3.0-or-later
  ```

- Prefer small components and focused changes.
- Add or update tests for behavior changes.

## Code of Conduct

This project follows the [LibreSign Code of Conduct](https://github.com/LibreSign/libresign/blob/main/CODE_OF_CONDUCT.md). By participating, you are expected to follow it.

## License

By contributing, you agree that your contributions will be licensed under AGPL-3.0-or-later.
