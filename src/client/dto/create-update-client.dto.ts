import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class CreateUpdateClientDto {
	@IsString()
	@Transform(({ value }) => value?.trim())
	@IsNotEmpty({ message: 'Name is required' })
	@MinLength(2, { message: 'Name must be at least 2 characters' })
	@MaxLength(64, { message: 'Name must be at most 64 characters' })
	name: string

	@IsOptional()
	@IsString()
	@Transform(({ value }) => value?.trim())
	@MaxLength(20)
	@Matches(/^[0-9+\-\s()]*$/, {
		message: 'Phone contains invalid characters'
	})
	phone?: string

	@IsOptional()
	@IsString()
	@Transform(({ value }) => value?.trim())
	@MaxLength(500, { message: 'Description is too long' })
	description?: string
}
