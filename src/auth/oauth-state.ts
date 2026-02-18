import { UnauthorizedException } from '@nestjs/common'
import * as crypto from 'node:crypto'

export function signState(payload: object) {
	const json = JSON.stringify(payload)
	const base = Buffer.from(json).toString('base64url')

	const signature = crypto
		.createHmac('sha256', process.env.OAUTH_STATE_SECRET!)
		.update(base)
		.digest('base64url')

	return `${base}.${signature}`
}

export function verifyState(state: string) {
	const [base, signature] = state.split('.')

	const expectedSignature = crypto
		.createHmac('sha256', process.env.OAUTH_STATE_SECRET!)
		.update(base)
		.digest('base64url')

	if (signature !== expectedSignature) {
		throw new UnauthorizedException('Invalid OAuth state')
	}

	return JSON.parse(Buffer.from(base, 'base64url').toString())
}
