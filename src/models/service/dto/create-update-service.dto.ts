import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  MinLength
} from 'class-validator'
import { Transform } from 'class-transformer'

export class CreateUpdateServiceDto {
  @IsString()
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(64, { message: 'Name must be at most 64 characters' })
  name: string

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  @MaxLength(500, { message: 'Description is too long' })
  description?: string

  @IsNumber({}, { message: 'Must be a number' })
  @Max(720)
  durationMin: number

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Price must be a valid decimal with max 2 decimal places'
  })
  @Transform(({ value }) => value?.trim())
  price: string
}
