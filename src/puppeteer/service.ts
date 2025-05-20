import os from "os";
import * as puppeteer from "puppeteer-core";

export default class PuppeteerService {
  browser: puppeteer.Browser;

  constructor({ browser }: { browser: puppeteer.Browser }) {
    this.browser = browser;
  }

  static async autoScroll(page: puppeteer.Page) {
    await page.evaluate(async () => {
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      const scrollContainer = document.querySelector('div[role="main"]'); // atau sesuaikan dengan elemen utama
      if (!scrollContainer) {
        console.error("Scroll container tidak ditemukan");
        return;
      }

      let lastScrollTop = -1;
      let sameScrollCount = 0;

      while (sameScrollCount < 10) {
        // berhenti setelah 10 kali tidak ada perubahan scroll
        scrollContainer.scrollBy(0, 1000);
        await delay(500);

        const currentScrollTop = scrollContainer.scrollTop;

        if (currentScrollTop === lastScrollTop) {
          sameScrollCount++;
        } else {
          sameScrollCount = 0;
        }

        lastScrollTop = currentScrollTop;
      }

      console.log("Selesai auto-scroll");
    });
  }

  static getChromePath() {
    const platform = os.platform();

    if (platform === "win32") {
      return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    } else if (platform === "darwin") {
      return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    } else if (platform === "linux") {
      return "/usr/bin/google-chrome";
    } else {
      throw new Error("Unsupported OS");
    }
  }

  static defaultOption() {
    const option = {
      executablePath: this.getChromePath(),
      // args: ["--no-sandbox", "--disable-setuid-sandbox"],
    };

    return option;
  }

  static async create() {
    const browser = await puppeteer.launch();

    return new PuppeteerService({ browser: browser });
  }
}
