import type { Page } from "@playwright/test";

// Benign console noise to ignore when guarding against errors.
const IGNORE = [
  /favicon/i,
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /clerk.*development/i,
  /ResizeObserver loop/i,
];

/**
 * Attach a console-error collector to a page. Returns a getter for the errors
 * seen so far (filtered of known benign noise). Use to assert a flow produced
 * no unexpected client errors.
 */
export function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORE.some((re) => re.test(text))) return;
    errors.push(text);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return () => errors.slice();
}
