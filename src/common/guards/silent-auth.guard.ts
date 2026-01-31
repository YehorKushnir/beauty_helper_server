import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { setRefreshCookie } from '../utils/cookies'
import { AuthService } from '../../auth/auth.service'
import { verifyAccess } from '../../auth/access-jwt'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { Reflector } from '@nestjs/core'

@Injectable()
export class SilentAuthGuard implements CanActivate {
	constructor(
		private readonly authService: AuthService,
		private readonly reflector: Reflector
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass()
		])

		if (isPublic) return true

		const req = context.switchToHttp().getRequest()
		const res = context.switchToHttp().getResponse()

		const authHeader: string | undefined = req.headers['authorization']

		const access = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined

		if (access) {
			try {
				const payload = verifyAccess(access)

				req.user = {
					sub: payload.sub,
					sid: payload.sid,
					role: payload.role
				}

				return true
			} catch {}
		}

		const refreshSecret = req.cookies?.refresh
		if (!refreshSecret || !access) {
			throw new UnauthorizedException()
		}

		const rotated = await this.authService.rotateSilently(access, refreshSecret)

		setRefreshCookie(res, rotated.newRefreshSecret)

		res.setHeader('x-access-token', rotated.newAccess)

		req.user = {
			sub: rotated.userId,
			sid: rotated.sid,
			role: rotated.role
		}

		return true
	}
}
