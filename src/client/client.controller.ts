import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ClientService } from './client.service'
import { CreateUpdateClientDto } from './dto/create-update-client.dto'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'
import { GetClientsQueryDto } from './dto/get-client-query.dto'

@Controller('client')
export class ClientController {
	constructor(private readonly clientService: ClientService) {}

	@Get('find-by-query')
	async findByQuery(@CurrentUser() user: RequestUser, @Query() query: { search: string }) {
		console.log(query)
		return this.clientService.findByQuery(user.sub, query.search)
	}

	@Get('find-for-table')
	async findForTable(@CurrentUser() user: RequestUser, @Query() query: GetClientsQueryDto) {
		return this.clientService.findForTable(user.sub, query)
	}

	@Get(':id')
	async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
		return this.clientService.findOne(user.sub, id)
	}

	@Post()
	async create(@CurrentUser() user: RequestUser, @Body() dto: CreateUpdateClientDto) {
		return this.clientService.create(user.sub, dto)
	}

	@Patch(':id')
	async update(
		@CurrentUser() user: RequestUser,
		@Param('id') id: string,
		@Body() dto: CreateUpdateClientDto
	) {
		return this.clientService.update(user.sub, id, dto)
	}

	@Patch('archive/:id')
	async archive(@CurrentUser() user: RequestUser, @Param('id') id: string) {
		return this.clientService.archive(user.sub, id)
	}

	@Patch('unarchive/:id')
	async unArchive(@CurrentUser() user: RequestUser, @Param('id') id: string) {
		return this.clientService.unArchive(user.sub, id)
	}

	@Patch('ban/:id')
	async ban(
		@CurrentUser() user: RequestUser,
		@Param('id') id: string,
		@Body() body: { reason: string }
	) {
		return this.clientService.ban(user.sub, id, body.reason)
	}

	@Patch('unban/:id')
	async unBan(@CurrentUser() user: RequestUser, @Param('id') id: string) {
		return this.clientService.unBan(user.sub, id)
	}

	@Patch('remove-data/:id')
	async removeClientData(@CurrentUser() user: RequestUser, @Param('id') id: string) {
		return this.clientService.removeClientData(user.sub, id)
	}

	@Delete(':id')
	async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
		return this.clientService.remove(user.sub, id)
	}
}
