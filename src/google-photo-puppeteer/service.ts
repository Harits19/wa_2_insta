import PuppeteerService from "../puppeteer/service";
import * as p from "puppeteer-core";

export default class GooglePhotoPuppeteerService {
  async downloadImageByDate({
    dates,
    outputPath,
  }: {
    dates: Date[];
    outputPath: string;
  }) {
    const browserURL = "http://localhost:9222";

    const browser = await p.connect({
      browserURL,
    });
    const page = await browser.newPage();

    console.log("opened Page");
    await page.goto("https://photos.google.com/", {
      waitUntil: "networkidle2",
    });

    console.log("after networkIdle");

    const ariaLabel = "Pilih semua foto dari Kam, 2 Jan 2020";

    // Tunggu hingga elemen dengan atribut aria-label tertentu muncul
    await page.waitForSelector(`[aria-label="${ariaLabel}"]`);

    // Ambil teks atau informasi lainnya dari elemen tersebut
    const elementText = await page.$eval(
      `[aria-label="${ariaLabel}"]`,
      (el) => el.textContent
    );

    console.log("Isi elemen:", elementText);

    await PuppeteerService.autoScroll(page);
    console.log("afterScrollToBottom");

    for (const date of dates) {
    }
  }
}
