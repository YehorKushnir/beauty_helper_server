import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { SilentAuthGuard } from './common/guards/silent-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'
import * as express from 'express'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)

	app.enableCors({
		origin: process.env.CLIENT_ORIGIN,
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

	app.use('/uploads', express.static('uploads'))

	await app.listen(process.env.PORT as string)
}
void bootstrap()
