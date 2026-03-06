import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../infra/prisma/prisma.service'
import { CreateUpdateAppointmentDto } from './dto/create-update.dto'
import { GetAppointmentQueryDto } from './dto/get-appointment-query.dto'
import { AppointmentStatus, PaymentStatus, Prisma } from '../../../prisma/generated/prisma/client'

@Injectable()
export class AppointmentService {
	constructor(private readonly prisma: PrismaService) {}

	async findForCalendar(userId: string, query: GetAppointmentQueryDto) {
		if (!query.from || !query.to) {
			throw new BadRequestException('from and to are required for calendar')
		}

		if (query.from >= query.to) {
			throw new BadRequestException('from must be less than to')
		}

		const items = await this.prisma.appointment.findMany({
			where: {
				userId,
				...(query.status ? { status: query.status } : {}),
				...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
				...(query.clientId ? { clientId: query.clientId } : {}),
				startAt: { lt: query.to },
				OR: [{ endAt: { gt: query.from } }, { endAt: null, startAt: { gte: query.from } }],
				...(query.search
					? {
							AND: [
								{
									OR: [
										{
											client: {
												name: {
													contains: query.search,
													mode: 'insensitive'
												}
											}
										},
										{
											items: {
												some: {
													name: {
														contains: query.search,
														mode: 'insensitive'
													}
												}
											}
										}
									]
								}
							]
						}
					: {})
			},
			orderBy: { startAt: 'asc' },
			select: {
				id: true,
				startAt: true,
				endAt: true,
				status: true,
				totalAmount: true,
				currency: true,
				paymentStatus: true,
				client: {
					select: {
						id: true,
						name: true,
						phone: true
					}
				},
				items: {
					select: {
						id: true,
						name: true,
						quantity: true,
						price: true,
						total: true,
						serviceId: true
					},
					orderBy: { createdAt: 'asc' }
				}
			}
		})

		return { items }
	}

	async findOne(userId: string, id: string) {
		const appointment = await this.prisma.appointment.findFirst({
			where: { id, userId },
			select: {
				id: true,
				startAt: true,
				endAt: true,
				status: true,
				totalAmount: true,
				currency: true,
				paymentStatus: true,
				clientId: true,
				createdAt: true,
				updatedAt: true,
				client: {
					select: {
						id: true,
						name: true,
						phone: true
					}
				},
				items: {
					select: {
						id: true,
						name: true,
						quantity: true,
						price: true,
						total: true,
						currency: true,
						serviceId: true
					},
					orderBy: { createdAt: 'asc' }
				},
				payments: {
					select: {
						id: true,
						amount: true,
						currency: true,
						method: true,
						paidAt: true,
						status: true,
						createdAt: true
					},
					orderBy: { createdAt: 'desc' }
				}
			}
		})

		if (!appointment) {
			throw new NotFoundException('Appointment not found')
		}

		return appointment
	}

	async create(userId: string, dto: CreateUpdateAppointmentDto) {
		const clientId = await this.resolveClientId(userId, {
			clientId: dto.clientId,
			newClient: dto.newClient
		})

		const prepared = await this.prepareItems(userId, dto.startAt, dto.items)

		await this.assertNoScheduleConflict(userId, dto.startAt, prepared.endAt)

		await this.prisma.appointment.create({
			data: {
				userId,
				startAt: dto.startAt,
				endAt: prepared.endAt,
				clientId,
				totalAmount: prepared.totalAmount,
				currency: prepared.currency,
				paymentStatus: 'PENDING',
				items: {
					create: prepared.items
				}
			}
		})

		return { success: true }
	}

	async update(userId: string, id: string, dto: CreateUpdateAppointmentDto) {
		const appointment = await this.prisma.appointment.findFirst({
			where: { id, userId },
			select: {
				id: true,
				status: true,
				clientId: true,
				payments: {
					select: {
						amount: true,
						status: true
					}
				}
			}
		})

		if (!appointment) {
			throw new NotFoundException('Appointment not found')
		}

		const clientId = await this.resolveClientId(userId, {
			clientId: dto.clientId,
			newClient: dto.newClient,
			fallbackClientId: appointment.clientId
		})

		const prepared = await this.prepareItems(userId, dto.startAt, dto.items)

		if (appointment.status === 'SCHEDULED') {
			await this.assertNoScheduleConflict(userId, dto.startAt, prepared.endAt, id)
		}

		const paymentStatus = this.calculatePaymentStatus(
			prepared.totalAmount,
			appointment.payments
		)

		await this.prisma.appointment.update({
			where: { id },
			data: {
				startAt: dto.startAt,
				endAt: prepared.endAt,
				clientId,
				totalAmount: prepared.totalAmount,
				currency: prepared.currency,
				paymentStatus,
				items: {
					deleteMany: {},
					create: prepared.items
				}
			}
		})

		return { success: true }
	}

	async cancel(userId: string, id: string) {
		return this.changeStatus(id, userId, 'CANCELED')
	}

	async complete(userId: string, id: string) {
		return this.changeStatus(id, userId, 'COMPLETED')
	}

	async schedule(userId: string, id: string) {
		const appointment = await this.prisma.appointment.findFirst({
			where: { id, userId },
			select: {
				startAt: true,
				endAt: true
			}
		})

		if (!appointment) {
			throw new NotFoundException('Appointment not found')
		}

		const computedEndAt =
			appointment.endAt ?? new Date(appointment.startAt.getTime() + 60 * 1000)

		await this.assertNoScheduleConflict(userId, appointment.startAt, computedEndAt, id)

		await this.safeUpdate({ id, userId }, { status: 'SCHEDULED' })

		return { success: true }
	}

	async remove(userId: string, id: string) {
		const result = await this.prisma.appointment.deleteMany({
			where: { id, userId }
		})

		if (result.count === 0) {
			throw new NotFoundException('Appointment not found')
		}

		return { success: true }
	}

	private async resolveClientId(
		userId: string,
		params: {
			clientId?: string | null
			newClient?: CreateUpdateAppointmentDto['newClient']
			fallbackClientId?: string | null
		}
	): Promise<string | null> {
		if (params.clientId !== undefined && params.newClient) {
			throw new BadRequestException('Provide either clientId or newClient')
		}

		if (params.clientId === null) {
			return null
		}

		if (typeof params.clientId === 'string') {
			const exists = await this.prisma.client.findFirst({
				where: {
					id: params.clientId,
					userId,
					status: { not: 'DELETED' }
				},
				select: { id: true }
			})

			if (!exists) {
				throw new BadRequestException('Client not found')
			}

			return exists.id
		}

		if (params.newClient) {
			const client = await this.prisma.client.create({
				data: {
					userId,
					name: params.newClient.name,
					phone: params.newClient.phone || null
				},
				select: { id: true }
			})

			return client.id
		}

		if (params.fallbackClientId !== undefined) {
			return params.fallbackClientId
		}

		return null
	}

	private async prepareItems(
		userId: string,
		startAt: Date,
		items: CreateUpdateAppointmentDto['items']
	) {
		if (items.length === 0) {
			throw new BadRequestException('Appointment must contain at least one service')
		}

		const normalizedItems = this.normalizeItems(items)
		const serviceIds = normalizedItems.map((item) => item.serviceId)

		const services = await this.prisma.service.findMany({
			where: {
				userId,
				id: { in: serviceIds }
			},
			select: {
				id: true,
				name: true,
				price: true,
				durationMin: true,
				currency: true
			}
		})

		if (services.length !== serviceIds.length) {
			throw new BadRequestException('One or more services not found')
		}

		const serviceById = new Map(services.map((service) => [service.id, service]))

		let durationMinTotal = 0
		let totalAmount = new Prisma.Decimal(0)
		const currency = services[0].currency

		const createItems = normalizedItems.map((item) => {
			const service = serviceById.get(item.serviceId)

			if (!service) {
				throw new BadRequestException('One or more services not found')
			}

			if (service.currency !== currency) {
				throw new BadRequestException(
					'All services in one appointment must use same currency'
				)
			}

			const rowTotal = service.price.times(item.quantity)

			durationMinTotal += service.durationMin * item.quantity
			totalAmount = totalAmount.plus(rowTotal)

			return {
				serviceId: service.id,
				name: service.name,
				quantity: item.quantity,
				price: service.price,
				total: rowTotal,
				currency: service.currency
			}
		})

		const endAt = new Date(startAt.getTime() + durationMinTotal * 60_000)

		return {
			items: createItems,
			totalAmount,
			currency,
			endAt
		}
	}

	private normalizeItems(items: CreateUpdateAppointmentDto['items']) {
		const grouped = new Map<string, number>()

		for (const item of items) {
			grouped.set(item.serviceId, (grouped.get(item.serviceId) ?? 0) + item.quantity)
		}

		return Array.from(grouped.entries()).map(([serviceId, quantity]) => ({
			serviceId,
			quantity
		}))
	}

	private calculatePaymentStatus(
		totalAmount: Prisma.Decimal,
		payments: { amount: Prisma.Decimal; status: PaymentStatus }[]
	): PaymentStatus {
		if (payments.length === 0 || totalAmount.lte(0)) {
			return 'PENDING'
		}

		let paidTotal = new Prisma.Decimal(0)
		let refundedTotal = new Prisma.Decimal(0)

		for (const payment of payments) {
			if (payment.status === 'PAID' || payment.status === 'PARTIAL') {
				paidTotal = paidTotal.plus(payment.amount)
			}

			if (payment.status === 'REFUNDED') {
				refundedTotal = refundedTotal.plus(payment.amount)
			}
		}

		const netPaid = paidTotal.minus(refundedTotal)

		if (netPaid.lte(0)) {
			if (paidTotal.gt(0) && refundedTotal.gt(0)) {
				return 'REFUNDED'
			}
			return 'PENDING'
		}

		if (netPaid.gte(totalAmount)) {
			return 'PAID'
		}

		return 'PARTIAL'
	}

	private async assertNoScheduleConflict(
		userId: string,
		startAt: Date,
		endAt: Date,
		excludeId?: string
	) {
		if (endAt <= startAt) {
			throw new BadRequestException('Invalid appointment time range')
		}

		const conflict = await this.prisma.appointment.findFirst({
			where: {
				userId,
				status: 'SCHEDULED',
				...(excludeId ? { id: { not: excludeId } } : {}),
				startAt: { lt: endAt },
				OR: [{ endAt: { gt: startAt } }, { endAt: null, startAt: { gte: startAt } }]
			},
			select: { id: true }
		})

		if (conflict) {
			throw new BadRequestException('This time slot is already booked')
		}
	}

	private async safeUpdate(
		where: Prisma.AppointmentWhereInput & { userId: string },
		data: Prisma.AppointmentUpdateManyMutationInput
	) {
		const result = await this.prisma.appointment.updateMany({ where, data })

		if (result.count === 0) {
			throw new NotFoundException('Appointment not found')
		}
	}

	private async changeStatus(id: string, userId: string, nextStatus: AppointmentStatus) {
		await this.safeUpdate({ id, userId }, { status: nextStatus })

		return { success: true }
	}
}
