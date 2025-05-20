import GooglePhotoPuppeteerService from "./google-photo-puppeteer/service";

export default async function main() {
  const service = new GooglePhotoPuppeteerService();

  await service.downloadImageByDate({
    dates: [],
    outputPath: "",
  });
}

main();
