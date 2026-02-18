export type OAuthProvider = 'google' | 'apple'

export type OAuthUser = {
	provider: OAuthProvider
	providerUserId: string
	email: string
	name?: string
	avatarUrl?: string
}
