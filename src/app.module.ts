import {Module} from '@nestjs/common'
import {ConfigModule} from '@nestjs/config'
import {PrismaModule} from './prisma/prisma.module'
import {AuthModule} from './auth/auth.module'
import {UserModule} from './user/user.module'
import {SilentAuthGuard} from './common/guards/silent-auth.guard'
import {RolesGuard} from './common/guards/roles.guard'
import {StorageModule} from './storage/storage.module';
import {PassportModule} from "@nestjs/passport";
import {GoogleStrategy} from "./auth/strategies/google.strategy";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true
		}),
		PrismaModule,
		AuthModule,
		UserModule,
		StorageModule,
		PassportModule.register({
			session: false, // 🔴 ВАЖНО: у тебя НЕ session-based auth
		}),
	],
	providers: [GoogleStrategy, SilentAuthGuard, RolesGuard]
})
export class AppModule {}
