import jwt from 'jsonwebtoken'

const isDev = process.env.NODE_ENV === 'dev'

export interface AccessTokenPayload {
  sub: string
  sid: string
  role: string
  type: 'access'
}

export function signAccess(payload: { sub: string; sid: string; role: string }) {
  return jwt.sign(payload, process.env.ACCESS_SECRET as string, {
    expiresIn: isDev ? '30d' : '30m'
  })
}

export function verifyAccess(token: string): AccessTokenPayload {
  return jwt.verify(token, process.env.ACCESS_SECRET as string) as AccessTokenPayload
}

export function verifyAccessIgnoreExp(token: string): AccessTokenPayload {
  return jwt.verify(token, process.env.ACCESS_SECRET as string, {
    ignoreExpiration: true
  }) as AccessTokenPayload
}
