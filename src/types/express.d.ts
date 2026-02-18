import type { OAuthUser } from '@/auth/types/oauth-user.type'

declare global {
	namespace Express {
		interface User extends OAuthUser {}
	}
}
