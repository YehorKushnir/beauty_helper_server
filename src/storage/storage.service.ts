import { Injectable } from '@nestjs/common'
import { promises as fs } from 'fs'
import * as path from 'path'

@Injectable()
export class StorageService {
	private uploadDir = path.join(process.cwd(), 'uploads')

	async upload(key: string, buffer: Buffer): Promise<string> {
		const filePath = path.join(this.uploadDir, key)

		await fs.mkdir(path.dirname(filePath), { recursive: true })
		await fs.writeFile(filePath, buffer)

		return `/uploads/${key}`
	}
}
