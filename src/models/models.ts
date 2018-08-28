
export interface IdentityProvider {
	id          : string,
	displayName : string,
	type        : number,
	eTag_64x64  : string,
	eTag_signin : string
}

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

export interface PubKey {
	version               : number,
	keySuite              : string,
	keyID                 : string,
	pubKey                : string,
	"start-date"          : string,
	userID                : string,
	auth0ID               : string,
	"signable-properties" : string[],
	signatures            : PubKeySignature[]
}

export interface PubKeySignature {
	sigID               : string,
	hashAlgorithm       : string,
	signature           : string,
	issuer              : string,
	"issue-date"        : string,
	"sig-expire"        : number,
	"signed-properties" : string[]
}

export interface MerkleTreeNode {
	type   : string,
	level  : number,
	left   : string,
	right  : string,
	parent : string
}

export interface MerkleTree {
	root           : string,
	hashalgo       : string,
	leaves         : number,
	levels         : number,
//	[hash: string] : MerkleTreeNode
}

export interface MerkleTreeValue {
	userID : string,
	pubKey : string,
	keyID  : string
}

export interface MerkleTreeInfo {
	merkle : MerkleTree,
	values : string[], // stringified MerkleTreeValue's
	lookup : {
		[user_id: string]: number
	}
}
