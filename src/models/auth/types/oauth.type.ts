export type OAuthProvider = 'google'

export type OAuthMode = 'login' | 'register' | 'connect'

export type OAuthState = {
	mode: OAuthMode
	token?: string
}
