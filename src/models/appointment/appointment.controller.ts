import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { AppointmentService } from './appointment.service'
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator'
import { CreateUpdateAppointmentDto } from './dto/create-update.dto'
import { GetAppointmentQueryDto } from './dto/get-appointment-query.dto'

@Controller('appointment')
export class AppointmentController {
	constructor(private readonly appointmentService: AppointmentService) {}

	@Get('calendar')
	async findForCalendar(
		@CurrentUser() user: RequestUser,
		@Query() query: GetAppointmentQueryDto
	) {
		return this.appointmentService.findForCalendar(user.sub, query)
	}

	@Get(':id')
	async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
		return this.appointmentService.findOne(user.sub, id)
	}

	@Post()
	async create(@CurrentUser() user: RequestUser, @Body() dto: CreateUpdateAppointmentDto) {
		return this.appointmentService.create(user.sub, dto)
	}

	@Patch(':id')
	async update(
		@CurrentUser() user: RequestUser,
		@Param('id') id: string,
		@Body() dto: CreateUpdateAppointmentDto
	) {
		return this.appointmentService.update(user.sub, id, dto)
	}

	@Patch('cancel/:id')
	async cancel(@CurrentUser() user: RequestUser, @Param('id') id: string) {
		return this.appointmentService.cancel(user.sub, id)
	}

	@Patch('complete/:id')
	async complete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
		return this.appointmentService.complete(user.sub, id)
	}

	@Patch('schedule/:id')
	async schedule(@CurrentUser() user: RequestUser, @Param('id') id: string) {
		return this.appointmentService.schedule(user.sub, id)
	}

	@Delete(':id')
	async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
		return this.appointmentService.remove(user.sub, id)
	}
}
