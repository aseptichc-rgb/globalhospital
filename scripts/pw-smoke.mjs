import { chromium } from "playwright";

const BASE = "http://localhost:3000";
// Pick an arbitrary supported language path — any value from [lang] routes
// works; we just need the chat page to mount.
const CHAT_URL = `${BASE}/en/chat`;

const consoleErrors = [];
const pageErrors = [];
const netFailures = [];
const requests = [];

const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const context = await browser.newContext({
  permissions: ["microphone"],
});
const page = await context.newPage();

page.on("console", (msg) => {
  const type = msg.type();
  if (type === "error" || type === "warning") {
    consoleErrors.push(`[${type}] ${msg.text()}`);
  }
});
page.on("pageerror", (err) => {
  pageErrors.push(err.stack || err.message);
});
page.on("requestfailed", (req) => {
  netFailures.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
});
page.on("response", (res) => {
  const url = res.url();
  if (url.includes("/api/gemini/live-token") || url.includes("pcm-worklet")) {
    requests.push(`${res.status()} ${url}`);
  }
});

console.log(`Visiting ${CHAT_URL} …`);
const resp = await page.goto(CHAT_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
console.log(`HTTP ${resp?.status()} ${resp?.url()}`);

await page.waitForTimeout(1500);

// Try to click the live-mode toggle button. Label changes based on state.
const liveOnBtn = page.getByRole("button", { name: /실시간 통역 켜기/ });
const liveBtnCount = await liveOnBtn.count();
console.log(`Live toggle button found: ${liveBtnCount > 0}`);

if (liveBtnCount > 0) {
  await liveOnBtn.first().click();
  // Give time for token fetch, audioWorklet load, Live WS connect, possible errors
  await page.waitForTimeout(5000);
}

console.log("\n=== PAGE ERRORS ===");
pageErrors.forEach((e) => console.log(e));
console.log("\n=== CONSOLE ERRORS/WARNINGS ===");
consoleErrors.forEach((e) => console.log(e));
console.log("\n=== NETWORK FAILURES ===");
netFailures.forEach((e) => console.log(e));
console.log("\n=== RELEVANT RESPONSES ===");
requests.forEach((e) => console.log(e));

await browser.close();

const fatal =
  pageErrors.length +
  netFailures.filter((f) => !f.includes("favicon")).length;
process.exit(fatal > 0 ? 1 : 0);
