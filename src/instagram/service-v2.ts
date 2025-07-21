import {
  IgApiClient,
} from "instagram-private-api";
import * as fs from "fs";
import { dirname } from "path";

export class InstagramServiceV2 {
  client: IgApiClient;
  cookiesKey: string;
  password?: string;
  username?: string;

  private constructor({
    cookiesKey,
    username,
    password,
  }: {
    cookiesKey: string;
    username?: string;
    password?: string;
  }) {
    this.client = new IgApiClient();
    this.cookiesKey = cookiesKey;
    this.username = username;
    this.password = password;
  }

  static async login({
    password,
    username,
  }: {
    password: string;
    username: string;
  }) {
    const instance = new InstagramServiceV2({
      cookiesKey: username,
      password,
      username,
    });
    await instance.initInstagramClient();
    return instance;
  }

  get sessionPath() {
    return `sessions/${this.cookiesKey}-session.json`;
  }

  get isHaveSession() {
    if (!this.cookiesKey) return false;
    const isHaveSession = fs.existsSync(this.sessionPath);
    return isHaveSession;
  }

  private async loadSession() {
    const session = JSON.parse(fs.readFileSync(this.sessionPath, "utf-8"));
    await this.client.state.deserialize(session);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("Session loaded!");
  }

  private async initInstagramClient(overrideSession: boolean = false) {
    const password = this.password;
    const username = this.username;
    const sessionPath = this.sessionPath;

    if (this.isHaveSession && !overrideSession) {
      await this.loadSession();
    } else {
      this.client = new IgApiClient();
      if (!password || !username) {
        throw new Error("empty username or password");
      }
      console.log("start init instagram client");

      this.client.state.generateDevice(username);
      await this.client.simulate.preLoginFlow();
      const loggedInUser = await this.client.account.login(username, password);
      console.log("loggedInUser", loggedInUser);

      // Save session data
      const serialized = await this.client.state.serialize();
      delete serialized.constants; // Remove unneeded constants
      await fs.promises.mkdir(dirname(sessionPath), { recursive: true });
      fs.writeFileSync(sessionPath, JSON.stringify(serialized));

      console.log("Session saved!");
    }
  }

}
