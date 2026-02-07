import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { AuthService } from '../../auth/auth.service'
import { signAccess, verifyAccess } from '../../auth/access-jwt'
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
				req.user = { sub: payload.sub, sid: payload.sid, role: payload.role }
				return true
			} catch {}
		}

		const sid = req.cookies?.sid
		const refreshSecret = req.cookies?.refresh

		if (!sid || !refreshSecret) throw new UnauthorizedException()

		const session = await this.authService.validateRefreshBySidAndSlide(sid, refreshSecret)

		const newAccess = signAccess({
			sub: session.userId,
			sid: session.id,
			role: session.user.role
		})

		res.setHeader('x-access-token', newAccess)

		req.user = { sub: session.userId, sid: session.id, role: session.user.role }
		return true
	}
}
