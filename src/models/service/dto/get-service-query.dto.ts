import { IsOptional, IsString } from 'class-validator'
import { Type } from 'class-transformer'
import { ServiceStatus } from '../../../../prisma/generated/prisma/enums'

export class GetServiceQueryDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  status?: ServiceStatus

  @IsOptional()
  @Type(() => Number)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20
}
