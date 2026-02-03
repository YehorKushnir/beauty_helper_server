import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UserRole } from '../../prisma/generated/prisma/enums'
import * as argon2 from 'argon2'

@Injectable()
export class UserService {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string) {
		return this.prisma.user.findUnique({
			where: { id }
		})
	}

	async findByEmail(email: string) {
		return this.prisma.user.findUnique({
			where: { email }
		})
	}

	async createWithPassword(
		name: string,
		email: string,
		password: string,
		role: UserRole = 'user'
	) {
		const passwordHash = await argon2.hash(password)

		return this.prisma.user.create({
			data: {
				name,
				email,
				passwordHash,
				role
			}
		})
	}

	async validateCredentials(email: string, password: string) {
		const user = await this.findByEmail(email)
		if (!user) return null

		if (!user.passwordHash) return null

		const ok = await argon2.verify(user.passwordHash, password)

		if (!ok) return null

		return user
	}

	async changePassword(userId: string, newPassword: string) {
		const hash = await argon2.hash(newPassword)

		return this.prisma.user.update({
			where: { id: userId },
			data: { passwordHash: hash }
		})
	}
}
