import type { Response } from 'express'

const isProd = process.env.NODE_ENV === 'production'

export function setRefreshCookie(res: Response, refreshSecret: string) {
	res.cookie('refresh', refreshSecret, {
		httpOnly: true,
		secure: isProd,
		sameSite: isProd ? 'strict' : 'lax',
		path: '/',
		maxAge: 30 * 24 * 60 * 60 * 1000
	})
}

export function setSidCookie(res: Response, sid: string) {
	res.cookie('sid', sid, {
		httpOnly: true,
		secure: isProd,
		sameSite: isProd ? 'strict' : 'lax',
		path: '/',
		maxAge: 30 * 24 * 60 * 60 * 1000
	})
}

export function clearAuthCookies(res: Response) {
	res.clearCookie('refresh', { path: '/' })
	res.clearCookie('sid', { path: '/' })
}
