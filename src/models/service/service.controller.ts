import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ServiceService } from './service.service'
import { CreateUpdateServiceDto } from './dto/create-update-service.dto'
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator'
import { GetServiceQueryDto } from './dto/get-service-query.dto'

@Controller('service')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get('find-by-query')
  async findByQuery(@CurrentUser() user: RequestUser, @Query() query: { search: string }) {
    return this.serviceService.findByQuery(user.sub, query.search)
  }

  @Get('find-for-table')
  async findForTable(@CurrentUser() user: RequestUser, @Query() query: GetServiceQueryDto) {
    return this.serviceService.findForTable(user.sub, query)
  }

  @Get(':id')
  async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.serviceService.findOne(user.sub, id)
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateUpdateServiceDto) {
    return this.serviceService.create(user.sub, dto)
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CreateUpdateServiceDto
  ) {
    return this.serviceService.update(user.sub, id, dto)
  }

  @Patch('archive/:id')
  async archive(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.serviceService.archive(user.sub, id)
  }

  @Patch('unarchive/:id')
  async unArchive(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.serviceService.unArchive(user.sub, id)
  }

  @Delete(':id')
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.serviceService.remove(user.sub, id)
  }
}
