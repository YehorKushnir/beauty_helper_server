import { Body, Controller, Delete, Get, NotFoundException, Param, Patch } from '@nestjs/common'
import { AuthService } from '../auth/auth.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { UserService } from './user.service'

interface RequestUser {
	sub: string
	sid: string
	role: string
}

@Controller('users')
export class UserController {
	constructor(
		private readonly usersService: UserService,
		private readonly authService: AuthService
	) {}

	@Get('me')
	async me(@CurrentUser() user: RequestUser) {
		const dbUser = await this.usersService.findById(user.sub)

		if (!dbUser) {
			throw new NotFoundException('User not found')
		}

		return {
			id: dbUser.id,
			name: dbUser.name,
			email: dbUser.email,
			role: dbUser.role
		}
	}

	@Patch('password')
	async changePassword(
		@CurrentUser() user: RequestUser,
		@Body('newPassword') newPassword: string
	) {
		await this.usersService.changePassword(user.sub, newPassword)

		await this.authService.revokeAll(user.sub)

		return { ok: true }
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
}
