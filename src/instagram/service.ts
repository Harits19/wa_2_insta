import { IgApiClient, PostingAlbumPhotoItem } from "instagram-private-api";
import { env } from "../env/service";
import * as fs from "fs";

const ig = new IgApiClient();

export async function initInstagramClient() {
  const sessionPath = "session.json";
  const isHaveSession = fs.existsSync(sessionPath);

  if (isHaveSession) {
    const session = JSON.parse(fs.readFileSync(sessionPath, "utf-8"));
    await ig.state.deserialize(session);
    console.log("Session loaded!");
  } else {
    console.log("start init instagram client");
    const username = env.INSTAGRAM_USERNAME;
    const password = env.INSTAGRAM_PASSWORD;

    ig.state.generateDevice(username);
    await ig.simulate.preLoginFlow();
    const loggedInUser = await ig.account.login(username, password);
    console.log("loggedInUser", loggedInUser);

    // Save session data
    const serialized = await ig.state.serialize();
    delete serialized.constants; // Remove unneeded constants
    fs.writeFileSync(sessionPath, JSON.stringify(serialized));

    console.log("Session saved!");
  }
}

export async function publishPhoto({
  base64,
  caption,
}: {
  base64: string;
  caption?: string;
}) {
  const publishResult = await ig.publish.photo({
    file: Buffer.from(base64, "base64"),
    caption: caption, // Caption for the post
  });

  console.log("Image posted successfully!", publishResult.upload_id);
}

export async function publishPhotos({
  items: photos,
  caption,
}: {
  items: string[];
  caption?: string;
}) {
  const items: PostingAlbumPhotoItem[] = photos.map((item) => ({
    file: Buffer.from(item, "base64"),
  }));
  const publishResult = await ig.publish.album({
    items,
    caption,
  });

  console.log("Image posted successfully!", publishResult.upload_id);
}
