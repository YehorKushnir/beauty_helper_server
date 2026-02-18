import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common'

export const OAuthUserDecorator = createParamDecorator(
    (_, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest()
        if (!request.user) {
            throw new UnauthorizedException()
        }
        return request.user
    }
)