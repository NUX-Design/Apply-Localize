# Repository Guidelines

## Project Structure

This repository contains a Figma plugin named **Apply Localize**. `code.ts` is the plugin controller: it scans text layers, finds matching string variables, and applies bindings. `ui.html` contains the plugin panel, styles, and browser-side message handling. `manifest.json` declares the Figma plugin entry point and UI file. The compiled `code.js` is the runtime entry point referenced by the manifest and is committed so the plugin can be imported from a repository checkout. `npm run build` regenerates it. There are no test or asset directories in this checkout.

## Build, Test, and Development

Run `npm install` to install the TypeScript and Figma plugin typings dependencies. Run `npm run build` to compile `code.ts` into `code.js`, then open/import the plugin in Figma using `manifest.json`. `npm run typecheck` checks types without emitting output; `npm run watch` rebuilds during development. Validate changes in Figma by scanning a file with multiple pages, checking candidate selection, and applying one or more string-variable bindings.

## Coding Style

Use two spaces for indentation. In TypeScript, follow the existing style: single-quoted strings, semicolons omitted, explicit message and data types, and descriptive `camelCase` names. Keep Figma API operations in `code.ts` and panel rendering and interaction in `ui.html`; communicate between them with typed plugin messages. Escape dynamic values before inserting them into HTML, as the existing UI does. Keep user-facing plugin copy in Thai consistent with the current interface.

## Testing Guidelines

No automated tests or coverage requirements are configured. For changes to scanning, verify pages are loaded and text layers with existing local bindings are handled correctly. For apply behavior, check both successful bindings and missing/deleted node or variable cases. For UI changes, verify collection filtering, variable selection, progress/status messages, and the single-item and bulk apply actions in Figma.

## Accessibility

For frontend work, follow the [A11Y.md guidelines](https://github.com/fecarrico/A11Y.md/blob/main/docs/en/A11Y.md) strictly. Use WCAG 2.1 Level AA as the default conformance target.

## Commits and Pull Requests

Git history is not available in this checkout, so no existing commit convention could be confirmed. Use short, imperative commit subjects (for example, `Handle missing string variables`). Pull requests should describe the user-visible change, note how it was checked in Figma, link related work where applicable, and include screenshots for panel or interaction changes.

## Configuration and Safety

Keep the manifest's `main` and `ui` paths aligned with the actual generated and source files. Do not commit credentials or unrelated generated output. Plugin changes can modify variable bindings in the open Figma document; verify the selected variable before using bulk apply.
