


export const listAspectRatio = ["16x9" , "1x1" , "4x5"] as const;
export type AspectRatio = (typeof listAspectRatio)[number];

