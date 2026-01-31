import type { Response } from 'express'

export function setRefreshCookie(res: Response, value: string) {
	res.cookie('refresh', value, {
		httpOnly: true,
		secure: true,
		sameSite: 'strict',
		path: '/',
		maxAge: 30 * 86400_000
	})
}

export function clearRefreshCookie(res: Response) {
	res.clearCookie('refresh', { path: '/' })
}
