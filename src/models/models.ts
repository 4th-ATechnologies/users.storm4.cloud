import {MerkleTree} from 'merkle-tree-gen';

export interface IdentityProvider {
	id          : string,
	displayName : string,
	type        : number,
	eTag_64x64  : string,
	eTag_signin : string
}

export interface UserInfo {
	user_id  : string,
	bucket   : string,
	region   : string,
	deleted ?: number
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

export interface MerkleTreeFileValue {
	userID : string,
	pubKey : string,
	keyID  : string
}

export interface MerkleTreeFile {
	merkle : MerkleTree,
	values : string[], // stringified MerkleTreeValue's
	lookup : {
		[user_id: string]: number|undefined
	}
}

export interface S4Rcrd {
	version : 3,

	// The `fileID` is set automatically by the server.
	// It will be a UUIDv4, with the dashes removed.
	//
	fileID ?: string,

	// The `sender` is set automatically by the server.
	// (Only applies to messages.)
	// 
	sender?: string,

	keys: {
		[identifier: string]: S4Rcrd_Key|undefined
	},

	// 1) Create your metadata as a JSON dictionary
	// 2) Encrypt the metadata using the file encryption key
	// 3) Base64 encode the encrypted data
	// 4) Set the base64 string as this value
	// 
	metadata?: string,

	// You must have exactly 1 of either:
	// - metadata
	// - data
	// 
	data?: string,

	// Date, expressed as milliseconds since epoch
	burnDate?: number
}

export interface S4Rcrd_Key {
	// Just set to "rws" for now ?
	perms: string,

	// 1) Encrypt the file encryption key using the user's public key
	// 2) Base64 encode the result
	// 3) Set the base64 string as this value
	// 
	key: string
}

export interface S4Rcrd_Metadata {
	filename : string
}

export interface S4Rcrd_Data_Message {
	version      : 2,
	type         : "ephemeral",
	message     ?: string,
	attachments  : S4Rcrd_Data_Attachment[]
}

export type S4Rcrd_Data_Attachment = [string, string, string];

export function make_attachment(
	options: {
		cloudPath   : string,
		cloudFileID : string,
		filename    : string
	}
): S4Rcrd_Data_Attachment
{
	return [options.cloudPath, options.cloudFileID, options.filename];
}

export interface S4MultipartCompleteRequest {
	bucket       : string,
	staging_path : string,
	upload_id    : string,
	parts        : string[]
}

export interface S4MultipartCompleteResponse {
	status_code : number,
	duplicate   : boolean
}

export interface S4PollRequest {
	requests: Array<[string, string]>
}

export interface S4PollResponse {
	[request_id: string]: {
		status    : number,
		change_id ?: string,
		info      ?: {
			ts      : number,
			app     : string,
			region  : string,
			bucket  : string,
			command : string,
			path    : string,
			fileID  : string,
			eTag    : string,
			type    : "metadata"|"data",
			id      : string,
    }
	}|undefined
}
