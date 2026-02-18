import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Post,
	Req,
	Res,
	UseGuards
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { clearAuthCookies, setRefreshCookie, setSidCookie } from '../common/utils/cookies'
import type { RequestUser } from '../common/decorators/current-user.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { UserService } from '../user/user.service'
import { Public } from '../common/decorators/public.decorator'
import { UAParser } from 'ua-parser-js'
import { signAccess } from './access-jwt'
import { AuthMethodsService } from './methods/auth-method.service'
import { AuthGuard } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import { GoogleAuthGuard } from '../common/guards/google-auth.guard'
import { UserRole } from '../../prisma/generated/prisma/enums'

interface User {
	id: string
	name: string
	email: string
	role: UserRole
	avatarUrl: string | null
}

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly usersService: UserService,
		private readonly authMethodsService: AuthMethodsService,
		private readonly config: ConfigService
	) {}

	private async completeLogin(user: User, @Req() req: Request, @Res() res: Response) {
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
				role: user.role,
				avatarUrl: user.avatarUrl
			}
		}
	}

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

		return await this.completeLogin(user, req, res)
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
			throw new BadRequestException('Invalid email or password')
		}

		return await this.completeLogin(user, req, res)
	}

	@Get('check-auth')
	async checkAuth(@CurrentUser() user: RequestUser) {
		const dbUser = await this.usersService.findById(user.sub)

		const newAccess = signAccess({
			sub: user.sub,
			sid: user.sid,
			role: user.role
		})

		return {
			access: newAccess,
			user: {
				id: dbUser.id,
				name: dbUser.name,
				email: dbUser.email,
				role: dbUser.role,
				avatarUrl: dbUser.avatarUrl
			}
		}
	}

	@Delete('password')
	removePassword(@CurrentUser() user: RequestUser) {
		return this.authService.removePassword(user.sub)
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

	@Get('auth-methods')
	async getAuthMethods(@CurrentUser() user: RequestUser) {
		return this.authMethodsService.getMethods(user.sub)
	}

	@Post('google/connect-token')
	async getGoogleConnectToken(@CurrentUser() user: RequestUser) {
		const token = await this.authService.createGoogleConnectToken(user.sub)
		return { token }
	}

	@Public()
	@Get('google')
	@UseGuards(GoogleAuthGuard)
	googleAuth() {}

	@Public()
	@Get('google/callback')
	@UseGuards(AuthGuard('google'))
	async oauthCallback(@Req() req: Request & { user: any }, @Res() res: Response) {
		const { mode, token, ...oauthUser } = req.user

		if (mode === 'connect') {
			try {
				await this.authService.connectOAuth(token, oauthUser)
				return res.redirect(this.config.get('CLIENT_ORIGIN') + '/settings/security')
			} catch (e) {
				return res.redirect(
					this.config.get('CLIENT_ORIGIN') + '/settings/security?error_code=UNAUTHORIZED'
				)
			}
		}

		if (mode === 'register') {
			try {
				const user = await this.authService.registerWithOAuth(oauthUser)

				await this.completeLogin(user, req, res)

				return res.redirect(this.config.get('CLIENT_ORIGIN') + '/dashboard')
			} catch (e) {
				return res.redirect(this.config.get('CLIENT_ORIGIN') + '/signup?error_code=EXIST')
			}
		}

		if (mode === 'login') {
			try {
				const user = await this.authService.loginWithOAuth(oauthUser)

				await this.completeLogin(user, req, res)

				return res.redirect(this.config.get('CLIENT_ORIGIN') + '/dashboard')
			} catch (e) {
				return res.redirect(
					this.config.get('CLIENT_ORIGIN') + '/login?error_code=NOT_LINKED'
				)
			}
		}

		return res.redirect(this.config.get('CLIENT_ORIGIN') + '/login?error_code=INVALID_MODE')
	}

	@Delete('google')
	disconnectGoogle(@CurrentUser() user: RequestUser) {
		return this.authService.disconnectGoogle(user.sub)
	}
}
