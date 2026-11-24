import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { openNewAgent, test, expect } from "./fixtures.ts";
import { testHome } from "./config.ts";
import { fileHref } from "../src/file-paths.ts";

async function login(page: Page, path = "/") {
  await page.goto(path);
  await page.getByLabel("Server token").fill(readFileSync(testHome + "/web-token", "utf8"));
  await page.getByRole("button", { name: "Connect", exact: true }).click();
}

test("resizing the desktop sidebar supports drag, keyboard and reload", async ({ page }) => {
  await login(page);
  const split = page.getByRole("separator", { name: "Resize conversation sidebar" });
  const sidebar = page.locator("#conversation-sidebar");
  const start = (await split.boundingBox())!;
  const initial = Number(await split.getAttribute("aria-valuenow"));
  await page.mouse.move(start.x + start.width / 2, start.y + 120);
  await page.mouse.down();
  await page.mouse.move(start.x + start.width / 2 + 87, start.y + 120, { steps: 5 });
  await page.mouse.up();
  await expect(split).toHaveAttribute("aria-valuenow", String(initial + 87));
  await split.press("ArrowRight");
  await expect(sidebar).toHaveCSS("width", (initial + 103) + "px");
  await page.reload();
  await expect(sidebar).toHaveCSS("width", (initial + 103) + "px");
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(split).toBeHidden();
});

test("a topic title and a manual rename persist in the current chat", async ({ page }) => {
  await login(page);
  await openNewAgent(page);
  const input = page.getByLabel("Message", { exact: true });
  await input.fill("For context, we talked yesterday. Please review invoice export permissions.");
  await input.press("Enter");
  const heading = page.locator("main header strong");
  await expect(heading).toHaveText("Review invoice export permissions");
  await page.getByRole("button", { name: "Chat options", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "Chat options" });
  await menu.getByRole("button", { name: "Rename chat" }).click();
  const name = menu.getByRole("textbox", { name: "Chat name" });
  await name.fill("  Invoice export permissions  ");
  await menu.getByRole("button", { name: "Save name" }).click();
  await expect(heading).toHaveText("Invoice export permissions");
  await page.reload();
  await expect(heading).toHaveText("Invoice export permissions");
});

test("on Windows, a local file preview sends the requested path only when Open file is clicked", async ({ page }) => {
  test.skip(process.platform !== "win32");
  const path = testHome + "/exports/notes.md";
  const opened: string[] = [];
  await page.exposeFunction("recordFileOpen", (file: string) => opened.push(file));
  await page.addInitScript(() => {
    const send = WebSocket.prototype.send;
    WebSocket.prototype.send = function (data) {
      const rpc = typeof data === "string" ? JSON.parse(data) : {};
      if (rpc.method === "fs.openOnHost") {
        void (window as any).recordFileOpen(rpc.params.path);
        queueMicrotask(() => this.dispatchEvent(new MessageEvent("message", {
          data: JSON.stringify({ id: rpc.id, result: { ok: true } }),
        })));
        return;
      }
      return send.call(this, data);
    };
  });
  await login(page, fileHref(path));
  const dialog = page.getByRole("dialog", { name: "File notes.md" });
  await expect(dialog.getByRole("heading", { name: "Import notes" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Copy path" })).toBeVisible();
  expect(opened).toEqual([]);
  await dialog.getByRole("button", { name: "Open file", exact: true }).click();
  await expect.poll(() => opened).toEqual([path.replaceAll("\\", "/")]);
});
