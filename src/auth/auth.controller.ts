import {
	BadRequestException,
	Body,
	Controller,
	Post,
	Req,
	Res,
	UnauthorizedException
} from '@nestjs/common'
import type { Request, Response } from 'express'

import { AuthService } from './auth.service'
import { clearAuthCookies, setRefreshCookie, setSidCookie } from '../common/utils/cookies'
import type { RequestUser } from '../common/decorators/current-user.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { RegisterDto } from './dto/register'
import { LoginDto } from './dto/login'
import { UserService } from '../user/user.service'
import { Public } from '../common/decorators/public.decorator'
import { UAParser } from 'ua-parser-js'

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly usersService: UserService
	) {}

	@Public()
	@Post('register')
	async register(
		@Req() req: Request,
		@Body() dto: RegisterDto,
		@Res({ passthrough: true }) res: Response
	) {
		const existing = await this.usersService.findByEmail(dto.email)

		if (existing) {
			throw new BadRequestException('Email already exists')
		}

		const user = await this.usersService.createWithPassword(dto.name, dto.email, dto.password)

		const parser = new UAParser(req.headers['user-agent'])
		const deviceName = `${parser.getBrowser().name} on ${parser.getOS().name}`

		const meta = {
			userAgent: req.headers['user-agent'],
			deviceName,
			ip: req.ip
		}

		const { sid, access, refreshSecret } = await this.authService.login(user, meta)

		setRefreshCookie(res, refreshSecret)
		setSidCookie(res, sid)

		return {
			access,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role
			}
		}
	}

	@Public()
	@Post('login')
	async login(
		@Req() req: Request,
		@Body() dto: LoginDto,
		@Res({ passthrough: true }) res: Response
	) {
		const user = await this.usersService.validateCredentials(dto.email, dto.password)

		if (!user) {
			throw new UnauthorizedException('Invalid credentials')
		}

		const parser = new UAParser(req.headers['user-agent'])

		const deviceName = `${parser.getBrowser().name} on ${parser.getOS().name}`

		const meta = {
			userAgent: req.headers['user-agent'],
			deviceName,
			ip: req.ip
		}

		const { sid, access, refreshSecret } = await this.authService.login(user, meta)

		setRefreshCookie(res, refreshSecret)
		setSidCookie(res, sid)

		return {
			access,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role
			}
		}
	}

	@Post('logout')
	async logout(@CurrentUser() user: RequestUser, @Res({ passthrough: true }) res: Response) {
		await this.authService.logout(user.sub, user.sid)
		clearAuthCookies(res)

		return { ok: true }
	}

	@Post('logout-all')
	async logoutAll(@CurrentUser() user: RequestUser, @Res({ passthrough: true }) res: Response) {
		await this.authService.revokeAll(user.sub)
		clearAuthCookies(res)

		return { ok: true }
	}
}
