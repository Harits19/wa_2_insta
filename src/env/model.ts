export const ENVKeyListNullable = ["REFRESH_TOKEN", "NODE_ENV"] as const;

export const ENVKeyList = [
  "INSTAGRAM_PASSWORD",
  "INSTAGRAM_USERNAME",
  "CLIENT_ID",
  "CLIENT_SECRET",
  ...ENVKeyListNullable,
] as const;

export type ENVKey = (typeof ENVKeyList)[number];

export type ENVModel = Record<ENVKey, string>;
