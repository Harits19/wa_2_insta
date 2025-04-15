import os from "os";
import puppet from "puppeteer";

export default class PuppeteerService {
  browser: puppet.Browser;

  constructor({ browser }: { browser: puppet.Browser }) {
    this.browser = browser;
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
    const option: puppet.LaunchOptions = {
      executablePath: this.getChromePath(),
      // args: ["--no-sandbox", "--disable-setuid-sandbox"],
    };

    return option;
  }

  static async create() {
    const browser = await puppet.launch();

    return new PuppeteerService({ browser: browser });
  }
}
