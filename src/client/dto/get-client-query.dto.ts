import { IsOptional, IsString } from 'class-validator'
import { Type } from 'class-transformer'
import { ClientStatus } from '../../../prisma/generated/prisma/enums'

export class GetClientsQueryDto {
	@IsOptional()
	@IsString()
	search?: string

	@IsOptional()
	@IsString()
	status?: ClientStatus

	@IsOptional()
	@Type(() => Number)
	page?: number = 1

	@IsOptional()
	@Type(() => Number)
	limit?: number = 20
}
