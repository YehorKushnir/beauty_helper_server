import * as crypto from 'node:crypto'

export function generateRefreshSecret() {
	return crypto.randomBytes(64).toString('hex')
}
