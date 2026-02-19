import { Injectable, NotFoundException } from '@nestjs/common'
import { CreateUpdateClientDto } from './dto/create-update-client.dto'
import { PrismaService } from '../prisma/prisma.service'
import { GetClientsQueryDto } from './dto/get-client-query.dto'
import { Prisma } from '../../prisma/generated/prisma/client'

@Injectable()
export class ClientService {
	constructor(private readonly prisma: PrismaService) {}

	async findByQuery(userId: string, query: string) {
		return this.prisma.client.findMany({
			where: {
				userId,
				...(query
					? {
							OR: [
								{ name: { contains: query, mode: 'insensitive' } },
								{ phone: { contains: query } }
							]
						}
					: {})
			},
			select: {
				id: true,
				name: true,
				phone: true
			},
			take: 20,
			orderBy: { createdAt: 'desc' }
		})
	}

	async findForTable(userId: string, query: GetClientsQueryDto) {
		const page = query.page ?? 1
		const limit = Math.min(query.limit ?? 20, 100)
		const skip = (page - 1) * limit

		const where = {
			userId,
			archivedAt: query.archived ? { not: null } : null,
			...(query.search
				? {
						OR: [
							{ name: { contains: query.search, mode: 'insensitive' as const } },
							{ phone: { contains: query.search } }
						]
					}
				: {})
		}

		const [items, total] = await this.prisma.$transaction([
			this.prisma.client.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
				select: {
					id: true,
					name: true,
					phone: true,
					description: true,
					archivedAt: true,
					bannedAt: true,
					createdAt: true
				}
			}),
			this.prisma.client.count({ where })
		])

		return {
			items,
			total,
			page,
			pages: Math.ceil(total / limit)
		}
	}

	async findOne(userId: string, id: string) {
		const client = await this.prisma.client.findFirst({
			where: { id, userId }
		})

		if (!client) {
			throw new NotFoundException('Client not found')
		}

		return client
	}

	async create(userId: string, dto: CreateUpdateClientDto) {
		await this.prisma.client.create({
			data: { ...dto, userId }
		})

		return { success: true }
	}

	async update(userId: string, id: string, dto: CreateUpdateClientDto) {
		await this.safeUpdate({ id, userId }, dto)

		return { success: true }
	}

	async archive(userId: string, id: string) {
		await this.safeUpdate(
			{ id, userId },
			{
				archivedAt: new Date()
			}
		)

		return { success: true }
	}

	async unArchive(userId: string, id: string) {
		await this.safeUpdate(
			{ id, userId },
			{
				archivedAt: null
			}
		)

		return { success: true }
	}

	async ban(userId: string, id: string, reason: string) {
		await this.safeUpdate(
			{ id, userId, anonymizedAt: null },
			{
				bannedAt: new Date(),
				bannedReason: reason
			}
		)

		return { success: true }
	}

	async unBan(userId: string, id: string) {
		await this.safeUpdate(
			{ id, userId },
			{
				bannedAt: null,
				bannedReason: null
			}
		)

		return { success: true }
	}

	async removeClientData(userId: string, id: string) {
		await this.safeUpdate(
			{ id, userId, anonymizedAt: null },
			{
				anonymizedAt: new Date(),
				archivedAt: new Date(),
				name: 'Deleted',
				phone: null,
				description: null
			}
		)

		return { success: true }
	}

	async remove(userId: string, id: string) {
		// const hasAppointments = await this.prisma.appointment.count({
		// 	where: { clientId: id, userId }
		// })
		//
		// if (hasAppointments > 0) {
		// 	throw new BadRequestException('Cannot delete client with appointments')
		// }

		const result = await this.prisma.client.deleteMany({
			where: { id, userId }
		})

		if (result.count === 0) {
			throw new NotFoundException('Client not found')
		}

		return { success: true }
	}

	private async safeUpdate(
		where: Prisma.ClientWhereInput & { userId: string },
		data: Prisma.ClientUpdateManyMutationInput
	) {
		const result = await this.prisma.client.updateMany({ where, data })
		if (result.count === 0) {
			throw new NotFoundException('Client not found')
		}
	}
}
