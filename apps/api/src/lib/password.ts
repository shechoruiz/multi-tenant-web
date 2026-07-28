import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hash(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function compare(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
