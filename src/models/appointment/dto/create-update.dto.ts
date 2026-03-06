import { Transform, Type } from 'class-transformer'
import {
	ArrayMinSize,
	IsArray,
	IsDate,
	IsInt,
	IsOptional,
	IsString,
	IsUUID,
	Matches,
	Max,
	MaxLength,
	Min,
	MinLength,
	ValidateNested
} from 'class-validator'

class AppointmentServiceItemDto {
	@IsUUID()
	serviceId: string

	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	quantity: number
}

class NewClientDto {
	@IsString()
	@Transform(({ value }: { value: unknown }) =>
		typeof value === 'string' ? value.trim() : value
	)
	@MinLength(2, { message: 'Name must be at least 2 characters' })
	@MaxLength(64, { message: 'Name must be at most 64 characters' })
	name: string

	@IsOptional()
	@IsString()
	@Transform(({ value }: { value: unknown }) =>
		typeof value === 'string' ? value.trim() : value
	)
	@MaxLength(20)
	@Matches(/^[0-9+\-\s()]*$/, {
		message: 'Phone contains invalid characters'
	})
	phone?: string
}

export class CreateUpdateAppointmentDto {
	@Type(() => Date)
	@IsDate({ message: 'startAt must be a valid date' })
	startAt: Date

	@IsOptional()
	@IsUUID()
	clientId?: string | null

	@IsOptional()
	@ValidateNested()
	@Type(() => NewClientDto)
	newClient?: NewClientDto

	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => AppointmentServiceItemDto)
	items: AppointmentServiceItemDto[]
}
