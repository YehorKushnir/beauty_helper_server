import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './infra/prisma/prisma.module'
import { AuthModule } from './models/auth/auth.module'
import { UserModule } from './models/user/user.module'
import { SilentAuthGuard } from './common/guards/silent-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'
import { StorageModule } from './infra/storage/storage.module'
import { PassportModule } from '@nestjs/passport'
import { GoogleStrategy } from './models/auth/strategies/google.strategy'
import { ClientModule } from './models/client/client.module'

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
			session: false // 🔴 ВАЖНО: у тебя НЕ session-based auth
		}),
		ClientModule
	],
	providers: [GoogleStrategy, SilentAuthGuard, RolesGuard]
})
export class AppModule {}
