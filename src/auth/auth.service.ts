import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as argon2 from 'argon2'
import * as crypto from 'crypto'
import { signAccess } from './access-jwt'
import { generateRefreshSecret } from '../common/utils/refresh-secret'
import { AuthMethodsService } from './methods/auth-method.service'
import type { OAuthUser } from './types/oauth-user-type'
import { hashToken } from './connect-token'

const REFRESH_DAYS = 30

function addDays(days: number) {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

@Injectable()
export class AuthService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly authMethod: AuthMethodsService
	) {}

	async login(
		user: { id: string; role: string },
		meta: {
			userAgent?: string
			ip?: string
			deviceName?: string
		}
	) {
		const sid = crypto.randomUUID()

		const refreshSecret = generateRefreshSecret()
		const refreshHash = await argon2.hash(refreshSecret)

		await this.prisma.session.create({
			data: {
				id: sid,
				userId: user.id,
				refreshSecretHash: refreshHash,
				refreshExpiresAt: addDays(REFRESH_DAYS),
				status: 'active',
				userAgent: meta.userAgent,
				ip: meta.ip,
				deviceName: meta.deviceName,
				lastUsedAt: new Date()
			}
		})

		const access = signAccess({
			sub: user.id,
			sid,
			role: user.role
		})

		return {
			sid,
			access,
			refreshSecret
		}
	}

	async logout(userId: string, sid: string) {
		await this.prisma.session.updateMany({
			where: {
				id: sid,
				userId,
				status: 'active'
			},
			data: {
				status: 'revoked'
			}
		})
	}

	async revokeAll(userId: string) {
		await this.prisma.session.updateMany({
			where: {
				userId,
				status: 'active'
			},
			data: {
				status: 'revoked'
			}
		})
	}

	async validateRefreshBySidAndSlide(sid: string, refreshSecret: string) {
		const session = await this.prisma.session.findUnique({
			where: { id: sid },
			include: { user: true }
		})

		if (!session || session.status !== 'active') {
			throw new UnauthorizedException()
		}

		const ok = await argon2.verify(session.refreshSecretHash, refreshSecret)
		if (!ok) throw new UnauthorizedException()

		if (session.refreshExpiresAt < new Date()) {
			throw new UnauthorizedException()
		}

		await this.prisma.session.update({
			where: { id: sid },
			data: {
				refreshExpiresAt: addDays(30),
				lastUsedAt: new Date()
			}
		})

		return session
	}

	async getActiveSessions(userId: string) {
		return this.prisma.session.findMany({
			where: {
				userId,
				status: 'active'
			},
			select: {
				id: true,
				deviceName: true,
				userAgent: true,
				ip: true,
				lastUsedAt: true,
				createdAt: true
			},
			orderBy: {
				lastUsedAt: 'desc'
			}
		})
	}

	async revokeSession(userId: string, sessionId: string) {
		await this.prisma.session.updateMany({
			where: {
				id: sessionId,
				userId,
				status: 'active'
			},
			data: {
				status: 'revoked'
			}
		})
	}

	async removePassword(userId: string) {
		await this.authMethod.assertCanRemoveAuthMethod(userId, 'password')

		await this.prisma.user.update({
			where: { id: userId },
			data: { passwordHash: null }
		})
	}

	async disconnectGoogle(userId: string) {
		await this.authMethod.assertCanRemoveAuthMethod(userId, 'provider')

		await this.prisma.authProvider.delete({
			where: {
				user_provider_unique: {
					userId,
					provider: 'google'
				}
			}
		})
	}

	async loginWithOAuth(oauthUser: OAuthUser) {
		const link = await this.prisma.authProvider.findUnique({
			where: {
				provider_providerUserId: {
					provider: oauthUser.provider,
					providerUserId: oauthUser.providerUserId
				}
			},
			include: { user: true }
		})

		if (!link) {
			throw new UnauthorizedException('Account is not linked')
		}

		return link.user
	}

	async registerWithOAuth(oauthUser: OAuthUser) {
		const existingLink = await this.prisma.authProvider.findUnique({
			where: {
				provider_providerUserId: {
					provider: oauthUser.provider,
					providerUserId: oauthUser.providerUserId
				}
			}
		})

		if (existingLink) {
			throw new BadRequestException('Account already exists')
		}

		const user = await this.prisma.user.create({
			data: {
				email: oauthUser.email,
				name: oauthUser.name ?? '',
				avatarUrl: oauthUser.avatarUrl
			}
		})

		await this.prisma.authProvider.create({
			data: {
				userId: user.id,
				provider: oauthUser.provider,
				providerUserId: oauthUser.providerUserId,
				emailAtLink: oauthUser.email
			}
		})

		return user
	}

	async createGoogleConnectToken(userId: string) {
		const token = crypto.randomUUID()
		const tokenHash = hashToken(token)

		await this.prisma.oAuthConnectToken.create({
			data: {
				tokenHash,
				userId,
				provider: 'google',
				expiresAt: new Date(Date.now() + 5 * 60 * 1000)
			}
		})

		return token
	}

	async connectOAuth(token: string, oauthUser: OAuthUser) {
		const tokenHash = hashToken(token)

		const connectToken = await this.prisma.oAuthConnectToken.findUnique({
			where: { tokenHash }
		})

		if (!connectToken) throw new UnauthorizedException()

		await this.prisma.authProvider.create({
			data: {
				userId: connectToken.userId,
				provider: oauthUser.provider,
				providerUserId: oauthUser.providerUserId,
				emailAtLink: oauthUser.email
			}
		})

		await this.prisma.oAuthConnectToken.delete({
			where: { tokenHash }
		})
	}
}
