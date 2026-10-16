const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push({ type: "console", text: msg.text() });
  });
  page.on("pageerror", (err) => errors.push({ type: "pageerror", text: err.message }));

  await page.goto("http://localhost:3000/", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(4000);

  // Also check an error overlay / next dev error
  const bodyText = await page.locator("body").textContent();
  const hasErrorOverlay = await page.locator("text=Unhandled Runtime Error, text=Error, text=Sad").count() > 0;

  const info = await page.evaluate(() => {
    const main = document.querySelector("main");
    const canvas = main && main.querySelector("canvas");
    const rect = canvas && canvas.getBoundingClientRect();
    return {
      hasCanvas: Boolean(canvas),
      canvasSize: rect ? [Math.round(rect.width), Math.round(rect.height)] : null,
      canvasPos: rect ? [Math.round(rect.x), Math.round(rect.y)] : null,
      bodyBg: document.body ? getComputedStyle(document.body).backgroundColor : null,
      mainBg: main ? getComputedStyle(main).backgroundColor : null,
      h1: document.querySelector("h1")?.textContent ?? null,
      h1Visible: document.querySelector("h1") ? document.querySelector("h1").getBoundingClientRect().width > 0 : null,
      overlayVisible: !!document.querySelector('[role="dialog"], .next-error, [data-nextjs-error]'),
    };
  });

  await page.screenshot({ path: "/tmp/opencode/debug-home.png", fullPage: true });
  console.log("BODY_TEXT_START", bodyText.slice(0, 500), "BODY_TEXT_END");
  console.log("INFO", JSON.stringify(info, null, 2));
  console.log("ERRORS", JSON.stringify(errors, null, 2));
  console.log("HAS_OVERLAY", hasErrorOverlay);
  await browser.close();
})();
