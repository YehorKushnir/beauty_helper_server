import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UserRole } from '../../prisma/generated/prisma/enums'
import * as argon2 from 'argon2'
import sharp from 'sharp'
import { fileTypeFromBuffer } from 'file-type'
import { StorageService } from '../storage/storage.service'

@Injectable()
export class UserService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly storage: StorageService
	) {}

	async findById(id: string) {
		const user = await this.prisma.user.findUnique({
			where: { id }
		})

		if (!user) {
			throw new NotFoundException('User not found')
		}

		return user
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

	async changePassword(userId: string, password: string, newPassword: string) {
		const user = await this.findById(userId)
		const isPasswordCorrect = await argon2.verify(user.passwordHash, password)

		if (!isPasswordCorrect) {
			throw new BadRequestException({
				statusCode: 400,
				message: 'Password incorrect'
			})
		}

		const hash = await argon2.hash(newPassword)

		return this.prisma.user.update({
			where: { id: userId },
			data: { passwordHash: hash }
		})
	}

	async changeName(userId: string, name: string) {
		const user = await this.prisma.user.update({
			where: { id: userId },
			data: { name }
		})

		return user.name
	}

	async processAvatar(userId: string, file: Express.Multer.File) {
		if (!file) throw new BadRequestException()

		const type = await fileTypeFromBuffer(file.buffer)
		if (!type?.mime.startsWith('image/')) {
			throw new BadRequestException('File is not an image')
		}

		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { avatarUrl: true }
		})

		const buffer = await sharp(file.buffer).resize(256, 256).webp({ quality: 80 }).toBuffer()

		const key = `avatars/${crypto.randomUUID()}.webp`

		const newUrl = await this.storage.upload(key, buffer)

		await this.prisma.user.update({
			where: { id: userId },
			data: { avatarUrl: newUrl }
		})

		if (user?.avatarUrl) {
			await this.storage.deleteAvatar(user.avatarUrl).catch(() => {})
		}

		return newUrl
	}
}
