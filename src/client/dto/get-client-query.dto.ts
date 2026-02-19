import { IsBoolean, IsOptional, IsString } from 'class-validator'
import { Type } from 'class-transformer'

export class GetClientsQueryDto {
	@IsOptional()
	@IsString()
	search?: string

	@IsOptional()
	@IsBoolean()
	@Type(() => Boolean)
	archived?: boolean

	@IsOptional()
	@Type(() => Number)
	page?: number = 1

	@IsOptional()
	@Type(() => Number)
	limit?: number = 20
}
