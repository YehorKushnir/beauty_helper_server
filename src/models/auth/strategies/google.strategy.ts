import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-google-oauth20'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'
import { verifyState } from '../oauth-state'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
	constructor(config: ConfigService) {
		super({
			clientID: config.get<string>('GOOGLE_CLIENT_ID')!,
			clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET')!,
			callbackURL: `${config.get('API_URL')}/auth/google/callback`,
			scope: ['email', 'profile'],
			passReqToCallback: true
		})
	}

	async validate(req: Request, _: string, __: string, profile: any) {
		const parsed = verifyState(req.query.state as string)

		return {
			provider: 'google',
			providerUserId: profile.id,
			email: profile.emails?.[0]?.value,
			name: profile.displayName,
			avatarUrl: profile.photos?.[0]?.value,
			mode: parsed.mode,
			token: parsed.token
		}
	}
}
