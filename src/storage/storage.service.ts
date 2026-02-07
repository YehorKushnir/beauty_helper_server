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

	async deleteAvatar(keyOrUrl: string): Promise<void> {
		if (!keyOrUrl) return

		let relativePath = keyOrUrl

		if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
			relativePath = new URL(keyOrUrl).pathname
		}

		relativePath = relativePath.replace(/^\/+/, '')

		if (relativePath.startsWith('uploads/')) {
			relativePath = relativePath.slice('uploads/'.length)
		}

		if (relativePath.includes('..')) {
			throw new Error('Invalid avatar path')
		}

		const filePath = path.join(process.cwd(), 'uploads', relativePath)

		try {
			await fs.unlink(filePath)
		} catch (err: any) {
			if (err.code !== 'ENOENT') {
				throw err
			}
		}
	}
}
