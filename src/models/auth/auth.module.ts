import {forwardRef, Module} from '@nestjs/common'
import {AuthService} from './auth.service'
import {AuthController} from './auth.controller'
import {UserModule} from '../user/user.module'
import {AuthMethodsService} from "./methods/auth-method.service";

@Module({
	imports: [forwardRef(() => UserModule)],
	controllers: [AuthController],
	providers: [AuthService, AuthMethodsService],
	exports: [AuthService]
})
export class AuthModule {}
