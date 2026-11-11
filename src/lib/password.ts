import bcrypt from "bcryptjs";

const ROUNDS = 12;
let dummyHash: string | null = null;

async function hashDeTempo(): Promise<string> {
  if (!dummyHash) {
    dummyHash = await bcrypt.hash("dummy-timing-pad", ROUNDS);
  }
  return dummyHash;
}

export function hashPassword(senha: string): Promise<string> {
  return bcrypt.hash(senha, ROUNDS);
}

export async function verifyPassword(senha: string, hash: string | null): Promise<boolean> {
  const alvo = hash ?? (await hashDeTempo());
  const confere = await bcrypt.compare(senha, alvo);
  return Boolean(hash) && confere;
}
