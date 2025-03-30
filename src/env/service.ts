import { ENVKeyList, ENVModel } from "./model";
import dotenv from "dotenv";

dotenv.config();

export function checkENV() {
  const env: Partial<ENVModel> = {};

  for (const key of ENVKeyList) {
    const value = process.env[key];

    if (value === undefined || value === "") {
      throw new Error(`empty env value on key ${key}`);
    }

    env[key] = value;
  }

  return env as ENVModel;
}

export const env = checkENV();
