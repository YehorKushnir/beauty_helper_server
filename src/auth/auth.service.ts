import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as argon2 from 'argon2'
import * as crypto from 'crypto'
import { signAccess } from './access-jwt'
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
}
