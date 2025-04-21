export const ENVKeyListNullable = ["REFRESH_TOKEN"] as const;

export const ENVKeyList = [
  "INSTAGRAM_PASSWORD",
  "INSTAGRAM_USERNAME",
  "CLIENT_ID",
  "CLIENT_SECRET",
  "GOOGLE_PHOTO_DATES_BACKUP",
  ...ENVKeyListNullable,
] as const;

export type ENVKey = (typeof ENVKeyList)[number];

export type ENVModel = Record<ENVKey, string>;
