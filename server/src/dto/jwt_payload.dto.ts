export type JWTPayloadType = {
  userId: number;
  email: string;
  firstName: string;
  role: "ADMIN" | "USER" | "GUEST";
};
