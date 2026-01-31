import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { SilentAuthGuard } from './common/guards/silent-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true
		}),
		PrismaModule,
		AuthModule,
		UserModule
	],
	providers: [SilentAuthGuard, RolesGuard]
})
export class AppModule {}
