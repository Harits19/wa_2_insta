import { ENVKey, ENVKeyList, ENVKeyListNullable, ENVModel } from "./model";
import dotenv from "dotenv";
import path from "path";
import * as fs from "fs";

const NODE_ENV = process.env.NODE_ENV;

console.log({ NODE_ENV });
const envPath = path.join(
  __dirname,
  "..",
  "..",
  NODE_ENV ? `.env.${NODE_ENV}` : ".env"
);

console.log({ envPath });

dotenv.config({
  path: envPath,
});

export default class ENVService {
  checkENV() {
    const env: Partial<ENVModel> = {
      NODE_ENV,
    };

    for (const key of ENVKeyList) {
      const value = process.env[key];

      const isNullable = ENVKeyListNullable.some((item) => item === key);

      if ((value === undefined || value === "") && !isNullable) {
        throw new Error(`empty env value on key ${key}`);
      }

      env[key] = value;
    }

    return env as ENVModel;
  }

  updateEnvKey(key: ENVKey, newValue: string) {
    // Path to the .env file
    const envFilePath = ".env";

    // Read the .env file
    let envContent = fs.readFileSync(envFilePath, "utf-8");

    // Use a regular expression to find and replace the specific key
    const regex = new RegExp(`^${key}=[^\r\n]*`, "m");

    if (regex.test(envContent)) {
      // If key exists, replace its value
      envContent = envContent.replace(regex, `${key}=${newValue}`);
    } else {
      // If key doesn't exist, append it to the end of the file
      envContent += `\n${key}=${newValue}`;
    }

    // Write the updated content back to the .env file
    fs.writeFileSync(envFilePath, envContent, "utf-8");
    console.log(`Updated ${key} in .env file`);

    env = this.checkENV();
  }
}

export const envService = new ENVService();
export let env = envService.checkENV();
