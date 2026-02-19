import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	UploadedFile,
	UseInterceptors
} from '@nestjs/common'
import { AuthService } from '../auth/auth.service'
import type { RequestUser } from '../common/decorators/current-user.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { UserService } from './user.service'
import { FileInterceptor } from '@nestjs/platform-express'
import { PasswordDto } from './dto/password.dto'

@Controller('users')
export class UserController {
	constructor(
		private readonly usersService: UserService,
		private readonly authService: AuthService
	) {}

	@Get('me')
	async me(@CurrentUser() user: RequestUser) {
		const dbUser = await this.usersService.findById(user.sub)

		return {
			id: dbUser.id,
			name: dbUser.name,
			email: dbUser.email,
			role: dbUser.role,
			avatarUrl: dbUser.avatarUrl
		}
	}

	@Patch('password')
	async changePassword(@CurrentUser() user: RequestUser, @Body() dto: PasswordDto) {
		await this.usersService.changePassword(user.sub, dto.password, dto.password_new)

		return { ok: true }
	}

	@Patch('name')
	async changeName(@CurrentUser() user: RequestUser, @Body() dto: { name: string }) {
		return this.usersService.changeName(user.sub, dto.name)
	}

	@Get('sessions')
	async sessions(@CurrentUser() user: RequestUser) {
		return this.authService.getActiveSessions(user.sub)
	}

	@Delete('sessions/:id')
	async revokeSession(@CurrentUser() user: RequestUser, @Param('id') sessionId: string) {
		await this.authService.revokeSession(user.sub, sessionId)

		return { ok: true }
	}

	@Patch('avatar')
	@UseInterceptors(
		FileInterceptor('file', {
			limits: {
				fileSize: 10 * 1024 * 1024
			}
		})
	)
	async uploadAvatar(
		@CurrentUser() user: RequestUser,
		@UploadedFile() file: Express.Multer.File
	) {
		return this.usersService.processAvatar(user.sub, file)
	}
}
