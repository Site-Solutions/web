import { test, expect } from "@playwright/test";

// Full CRUD against the gated clients mutations (create / update / remove).
// Self-cleaning: the client created here is edited then deleted, so the suite
// leaves no residue in the dev database.
test.describe("clients CRUD", () => {
  test("create, edit, then delete a client", async ({ page }) => {
    const name = `E2E Client ${Date.now()}`;
    const editedName = `${name} (edited)`;

    await page.goto("/clients");
    await expect(page.getByText(/Clients/i).first()).toBeVisible();

    // ---- CREATE (clients.create) ----
    await page.getByRole("button", { name: /new client/i }).first().click();
    await page.getByPlaceholder("Acme Construction").fill(name);
    await page.getByPlaceholder("contact@acme.com").fill("e2e+client@example.com");
    await page.getByPlaceholder("(555) 123-4567").fill("5185550000");
    await page.getByRole("button", { name: /create client/i }).click();

    await expect(page.getByRole("heading", { name })).toBeVisible({ timeout: 20_000 });

    // ---- EDIT (clients.update) ----
    await page.getByRole("button", { name: `Edit ${name}` }).click();
    const nameField = page.getByPlaceholder("Acme Construction");
    await expect(nameField).toHaveValue(name);
    await nameField.fill(editedName);
    await page.getByRole("button", { name: /save|update|create client/i }).first().click();

    await expect(page.getByRole("heading", { name: editedName })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name, exact: true })).toHaveCount(0);

    // ---- DELETE (clients.remove) ----
    await page.getByRole("button", { name: `Delete ${editedName}` }).click();
    // Confirm in the "Delete client" modal (scope to the dialog so we don't
    // re-hit a card's own "Delete …" button).
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /^delete$/i }).click();

    await expect(page.getByRole("heading", { name: editedName })).toHaveCount(0, { timeout: 20_000 });
  });
});
