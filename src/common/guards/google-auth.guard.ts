import {ConfigService} from "@nestjs/config";
import { ExecutionContext, Injectable } from '@nestjs/common'
import {AuthGuard} from "@nestjs/passport";
import {signState} from "../../auth/oauth-state";

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
    constructor(private config: ConfigService) {
        super()
    }

    getAuthenticateOptions(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest()

        const state = signState({
            mode: request.query.mode,
            token: request.query.token,
        })

        return {
            state,
        }
    }
}