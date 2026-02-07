import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { Match } from '../../common/validators/match.validator'

export class RegisterDto {
	@IsString()
	@IsNotEmpty({ message: 'Name is required' })
	@MinLength(2, { message: 'Name must be at least 2 characters' })
	@MaxLength(64, { message: 'Name must be at most 64 characters' })
	name: string

	@IsEmail({}, { message: 'Invalid email format' })
	@IsNotEmpty({ message: 'Email is required' })
	email: string

	@IsString()
	@IsNotEmpty({ message: 'Password is required' })
	@MinLength(8, { message: 'Password must be at least 8 characters' })
	@MaxLength(64, { message: 'Password must be at most 64 characters' })
	@Matches(/[a-z]/, { message: 'Password must contain lowercase letter' })
	@Matches(/[A-Z]/, { message: 'Password must contain uppercase letter' })
	@Matches(/[0-9]/, { message: 'Password must contain number' })
	password: string

	@IsString()
	@IsNotEmpty({ message: 'Password confirmation is required' })
	@Match('password', { message: 'Passwords do not match' })
	password_confirmation: string
}
