import { Type } from 'class-transformer'
import { IsDate, IsOptional, IsString, IsUUID } from 'class-validator'
import { AppointmentStatus, PaymentStatus } from '../../../../prisma/generated/prisma/enums'

export class GetAppointmentQueryDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  status?: AppointmentStatus

  @IsOptional()
  @IsString()
  paymentStatus?: PaymentStatus

  @IsOptional()
  @IsUUID()
  clientId?: string

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date
}
