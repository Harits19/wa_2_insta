export const ENVKeyList = ["INSTAGRAM_PASSWORD", "INSTAGRAM_USERNAME"] as const;

export type ENVKey = (typeof ENVKeyList)[number];

export type ENVModel = Record<ENVKey, string >;
