import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET!

export interface TokenPayload {
  userId: string
  roleId: string
  email: string
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload
  } catch {
    return null
  }
}
