export interface UserInfo {
	user_id : string,
	bucket  : string,
	region  : string
}

export interface Auth0Identity {
	user_id     : string,
	provider    : string,
	connection  : string,
	profileData : any
}

export interface Auth0Profile {
	updated_at : string,
	user_metadata : {
		preferedAuth0ID  ?: string,
		preferredAuth0ID ?: string // if we ever get around to fixing the typo
	},
	identities : Auth0Identity[],
}

export interface UserProfile {
	s4    : UserInfo,
	auth0 : Auth0Profile
}
