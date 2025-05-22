export const DISTRICTS = [
  "Kassanda",
  "Mubende",
  "Kyegegwa",
  "Kikuube",
  "Kabarole"
] as const;

export type District = typeof DISTRICTS[number]; 