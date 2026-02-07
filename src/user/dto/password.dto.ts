import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { Match } from '../../common/validators/match.validator'

export class PasswordDto {
	@IsString()
	@IsNotEmpty({ message: 'Password is required' })
	password: string

	@IsString()
	@IsNotEmpty({ message: 'New password is required' })
	@MinLength(8, { message: 'New password must be at least 8 characters' })
	@MaxLength(64, { message: 'New password must be at most 64 characters' })
	@Matches(/[a-z]/, { message: 'New password must contain lowercase letter' })
	@Matches(/[A-Z]/, { message: 'New password must contain uppercase letter' })
	@Matches(/[0-9]/, { message: 'New password must contain number' })
	password_new: string

	@IsString()
	@IsNotEmpty({ message: 'Password confirmation is required' })
	@Match('password_new', { message: 'Passwords do not match' })
	password_confirmation: string
}
