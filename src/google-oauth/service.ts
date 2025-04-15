import { google } from "googleapis";
import { env, envService } from "../env/service";

export default class GoogleOauthService {
  oauth2Client = new google.auth.OAuth2(
    env.CLIENT_ID,
    env.CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob"
  );

  private constructor() {}

  static async create() {
    const instance = new GoogleOauthService();
    await instance.initLogin();

    return instance;
  }

  async initLogin() {
    if (env.REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({ refresh_token: env.REFRESH_TOKEN });

      return;
    }
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: "offline", // this is required to get the refresh token
      scope: ["https://www.googleapis.com/auth/photoslibrary.readonly"],
    });

    console.log("Authorize this app by visiting this url:", authUrl);

    await this.getToken();
  }

  async accessToken() {
    const tokenResponse = await this.oauth2Client.getAccessToken();

    return tokenResponse.token!;
  }

  async getToken() {
    return new Promise<void>((resolve, reject) => {
      // Prompt user to paste the authorization code
      const readline = require("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question("Enter the authorization code: ", async (code: unknown) => {
        try {
          // Exchange authorization code for access token
          if (typeof code !== "string") {
            throw new Error(`Invalid typeof code, the type is ${typeof code}`);
          }

          const { tokens } = await this.oauth2Client.getToken(code);

          this.oauth2Client.setCredentials(tokens);
          console.log("Access Token:", tokens.access_token);
          console.log("Refresh Token:", tokens.refresh_token);

          const refreshToken = tokens.refresh_token;
          if (!refreshToken) {
            throw new Error("Empty refresh token");
          }
          envService.updateEnvKey("REFRESH_TOKEN", refreshToken);

          rl.close();
          resolve();
        } catch (error) {
          console.error("Error getting tokens:", error);
          rl.close();
          reject(error);
        }
      });
    });
  }
}
