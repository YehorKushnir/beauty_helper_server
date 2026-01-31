import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { SilentAuthGuard } from './common/guards/silent-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)

	app.enableCors({
		origin: 'http://localhost:3001',
		credentials: true
	})

	app.use(cookieParser())

	app.useGlobalGuards(app.get(SilentAuthGuard), app.get(RolesGuard))

	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			whitelist: true
		})
	)

	await app.listen(process.env.PORT ?? 3000)
}
void bootstrap()
