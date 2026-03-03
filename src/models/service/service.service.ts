import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../infra/prisma/prisma.service'
import { Prisma, ServiceStatus } from '../../../prisma/generated/prisma/client'
import { GetServiceQueryDto } from './dto/get-service-query.dto'
import { CreateUpdateServiceDto } from './dto/create-update-service.dto'

@Injectable()
export class ServiceService {
	constructor(private readonly prisma: PrismaService) {}

	async findByQuery(userId: string, query: string) {
		return this.prisma.service.findMany({
			where: {
				userId,
				status: 'ACTIVE',
				name: { contains: query, mode: 'insensitive' }
			},
			select: {
				id: true,
				name: true,
				description: true,
				durationMin: true,
				price: true
			},
			take: 20,
			orderBy: { createdAt: 'desc' }
		})
	}

	async findForTable(userId: string, query: GetServiceQueryDto) {
		const page = query.page ?? 1
		const limit = Math.min(query.limit ?? 20, 100)
		const skip = (page - 1) * limit

		const isNumeric = query.search && !isNaN(Number(query.search))

		const where = {
			userId,
			status: query.status,
			...(query.search
				? {
						OR: [
							{ name: { contains: query.search, mode: 'insensitive' as const } },
							{
								description: {
									contains: query.search,
									mode: 'insensitive' as const
								}
							},
							...(isNumeric
								? [
										{
											durationMin: {
												equals: Number(query.search)
											}
										}
									]
								: []),
							...(isNumeric
								? [
										{
											price: {
												equals: new Prisma.Decimal(query.search)
											}
										}
									]
								: [])
						]
					}
				: {})
		}

		const [items, total] = await this.prisma.$transaction([
			this.prisma.service.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
				select: {
					id: true,
					name: true,
					description: true,
					status: true,
					price: true,
					durationMin: true
				}
			}),
			this.prisma.service.count({ where })
		])

		return {
			items,
			total,
			page,
			pages: Math.ceil(total / limit)
		}
	}

	async findOne(userId: string, id: string) {
		const service = await this.prisma.service.findFirst({
			where: { id, userId }
		})

		if (!service) {
			throw new NotFoundException('Service not found')
		}

		return service
	}

	async create(userId: string, dto: CreateUpdateServiceDto) {
		await this.prisma.service.create({
			data: { ...dto, userId }
		})

		return { success: true }
	}

	async update(userId: string, id: string, dto: CreateUpdateServiceDto) {
		await this.safeUpdate({ id, userId }, dto)

		return { success: true }
	}

	async archive(userId: string, id: string) {
		return this.changeStatus(id, userId, 'ARCHIVED')
	}

	async unArchive(userId: string, id: string) {
		return this.changeStatus(id, userId, 'ACTIVE')
	}

	async remove(userId: string, id: string) {
		const result = await this.prisma.service.deleteMany({
			where: { id, userId }
		})

		if (result.count === 0) {
			throw new NotFoundException('Service not found')
		}

		return { success: true }
	}

	private async safeUpdate(
		where: Prisma.ServiceWhereInput & { userId: string },
		data: Prisma.ServiceUpdateManyMutationInput
	) {
		const result = await this.prisma.service.updateMany({ where, data })
		if (result.count === 0) {
			throw new NotFoundException('Service not found')
		}
	}

	private async changeStatus(id: string, userId: string, nextStatus: ServiceStatus) {
		await this.safeUpdate({ id, userId }, { status: nextStatus })

		return { success: true }
	}
}
