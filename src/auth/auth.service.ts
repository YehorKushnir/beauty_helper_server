import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as argon2 from 'argon2'
import * as crypto from 'crypto'
import { signAccess, verifyAccessIgnoreExp } from './access-jwt'
import { generateRefreshSecret } from '../common/utils/refresh-secret'

const REFRESH_DAYS = 30

function addDays(days: number) {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

@Injectable()
export class AuthService {
	constructor(private readonly prisma: PrismaService) {}

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

	async rotateSilently(expiredAccessToken: string, refreshSecret: string) {
		const payload = verifyAccessIgnoreExp(expiredAccessToken)

		const userId = payload.sub
		const sid = payload.sid
		const role = payload.role

		return this.prisma.$transaction(async (tx) => {
			const rows = await tx.$queryRawUnsafe<any[]>(
				`SELECT *
				 FROM "Session"
				 WHERE id = $1
					 FOR UPDATE`,
				sid
			)

			const session = rows[0]
			if (!session) {
				throw new UnauthorizedException()
			}

			if (session.userId !== userId) {
				throw new UnauthorizedException()
			}

			if (session.status === 'revoked') {
				throw new UnauthorizedException()
			}

			if (session.status === 'rotated') {
				await tx.session.updateMany({
					where: {
						userId,
						status: 'active'
					},
					data: {
						status: 'revoked'
					}
				})

				throw new UnauthorizedException()
			}

			if (session.refreshExpiresAt < new Date()) {
				await tx.session.update({
					where: { id: sid },
					data: { status: 'revoked' }
				})

				throw new UnauthorizedException()
			}

			const ok = await argon2.verify(session.refreshSecretHash, refreshSecret)

			if (!ok) {
				await tx.session.updateMany({
					where: {
						userId,
						status: 'active'
					},
					data: {
						status: 'revoked'
					}
				})

				throw new UnauthorizedException()
			}

			const newSid = crypto.randomUUID()
			const newSecret = generateRefreshSecret()
			const newHash = await argon2.hash(newSecret)

			await tx.session.create({
				data: {
					id: newSid,
					userId,
					refreshSecretHash: newHash,
					refreshExpiresAt: addDays(REFRESH_DAYS),
					status: 'active',
					ip: session.ip,
					userAgent: session.userAgent,
					deviceName: session.deviceName
				}
			})

			await tx.session.update({
				where: { id: sid },
				data: {
					status: 'rotated',
					replacedBySessionId: newSid,
					lastUsedAt: new Date()
				}
			})

			const newAccess = signAccess({
				sub: userId,
				sid: newSid,
				role
			})

			return {
				newAccess,
				newRefreshSecret: newSecret,
				userId,
				sid: newSid,
				role
			}
		})
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
}
