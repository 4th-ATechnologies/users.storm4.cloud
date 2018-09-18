import * as _ from 'lodash';
import * as hasha from 'hasha';

import * as api_gateway from './APIGateway';
import * as base32 from '../util/Base32Decode';

import {Logger} from '../util/Logging'

import {
	IdentityProvider,
	UserInfo,
	Auth0Identity
} from '../models/models'

const log = Logger.Make('debug', 'Util');


export function buffer2Hex(
	buffer: ArrayBuffer
): string
{
	return Array.prototype.map.call(new Uint8Array(buffer), (x: number)=> ('00' + x.toString(16)).slice(-2)).join('');
}

/**
 * Must be a 32 character zBase32 encoded string.
**/
export function isValidUserID(str: string): boolean
{
	const regex = /^[ybndrfg8ejkmcpqxot1uwisza345h769]{32}$/;
	return regex.test(str);
}

export function userID2Hex(user_id: string): string
{
	if (!isValidUserID(user_id)) {
		return '';
	}

	const user_id_bytes = base32.base32Decode(user_id, 'zBase32');
	return buffer2Hex(user_id_bytes);
}

export function profileUrlForUser(user_id: string): string
{
	const host = api_gateway.getHost('us-west-2');
	const path = api_gateway.getPath(`/users/info/${user_id}`);

	return `https://${host}${path}?identities=1`;
}

export function pubKeyUrlForUser(user_info: UserInfo): string
{
	const region = user_info.region;
	const bucket = user_info.bucket;

	return `https://s3-${region}.amazonaws.com/${bucket}/.pubKey`;
}

export function imageUrlForIdentityProvider_64(
	idp: IdentityProvider|Auth0Identity
): string
{
	let idp_id: string;
	if ((idp as IdentityProvider).id) {
		idp_id = (idp as IdentityProvider).id
	}
	else {
		idp_id = (idp as Auth0Identity).provider;
	}

	return `https://s3-us-west-2.amazonaws.com/com.4th-a.resources/socialmediaicons/64x64/${idp_id}.png`;
}

export function imageUrlForIdentityProvider_signin(
	idp: IdentityProvider|Auth0Identity
): string
{
	let idp_id: string;
	if ((idp as IdentityProvider).id) {
		idp_id = (idp as IdentityProvider).id
	}
	else {
		idp_id = (idp as Auth0Identity).provider;
	}

	return `https://s3-us-west-2.amazonaws.com/com.4th-a.resources/socialmediaicons/signin/${idp_id}.png`;
}

export function imageUrlForIdentity(
	identity  : Auth0Identity,
	user_info : UserInfo
): string|null
{
	let url: string|null = null;

	if (identity.provider == "auth0")
	{
		const region = user_info.region;
		const bucket = user_info.bucket;

		const components = identity.user_id.split('|');
		const auth0_id = components[components.length - 1];

		// Example:
		// https://s3-us-west-2.amazonaws.com/com.4th-a.user.jag15iacxneuco7owmegke63msbgyuyx-35e540bc/avatar/5a983d0232a70c286d7c1931

		url = `https://s3-${region}.amazonaws.com/${bucket}/avatar/${auth0_id}`;
	}
	else if (identity.provider == "facebook")
	{
		// From the docs:
		// https://developers.facebook.com/docs/graph-api/reference/user/picture/
		// 
		// URL format is:
		// https://graph.facebook.com/${facebookID}/picture
		// 
		// Query parameters of interest:
		// - type   : [small, normal, album, large, square]
		// - width  : number (in pixels)
		// - height : number (in pixels)
		// 
		// Examples:
		// - https://graph.facebook.com/10100211480983423/picture?type=small
		// - https://graph.facebook.com/10100211480983423/picture?type=normal
		// - https://graph.facebook.com/10100211480983423/picture?type=large
		// - https://graph.facebook.com/10100211480983423/picture?width=96&height=96
		// 
		// From testing:
		// - small  => 50 * 50
		// - normal => 100 * 100
		// - large  => 200 * 200

		url = `https://graph.facebook.com/${identity.user_id}/picture?type=large`;
	}
	else
	{
		const profileData = identity.profileData || {};
		const picUrl = profileData.picture;

		if (_.isString(picUrl))
		{
			url = picUrl;

			let test: URL|null = null;
			try {
				test = new URL(url);
			} catch(e){}

			if (test && test.host.includes("gravatar.com"))
			{
				if (url.includes("cdn.auth0.com/avatars"))
				{
					// Filter out the default auth0 picture.
					// We can use our own SVG generated icon.

					url = null;
				}
			}

			if (url && identity.provider == "bitbucket")
			{
				url = url.replace("/32/", "/128/");
			}
		}
	}

	return url;
}

export function displayNameForIdentity(
	identity  : Auth0Identity,
	user_info : UserInfo
): string
{
	let displayName: string|null = null;

	switch (identity.provider)
	{
		case "auth0":
		case "evernote":
		case "evernote-sandbox": {
			// Auth0 database connections use the term 'username'.
			// Evernote uses the term 'username'
			displayName = identity.profileData.username;
			break;
		}
		case "wordpress": {
			// wordpress uses the term 'display_name'
			displayName = identity.profileData.display_name;
			break;
		}
		default: {
			displayName = identity.profileData.name;
			break;
		}
	}
	
	if (!_.isString(displayName)) {
		displayName = user_info.user_id;
	}

	return displayName;
}

export function rpcURL(): string
{
	const accessToken = '94cbbe9f44574c19af2335390473a778';
	return `https://mainnet.infura.io/${accessToken}`;
}

export function rpcJSON(user_id: string): any
{
	return {
		jsonrpc : "2.0",
		method  : "eth_call",
		id      : 1,
		params  : [
			{
				to   : "0xF8CadBCaDBeaC3B5192ba29DF5007746054102a4",
				data : transactionData(user_id)
			},
			"latest"
		]
	}
}

export function transactionData(user_id: string): string
{
	// Data Layout:
	//
	// - First 4 bytes : Function signature
	// - Next 32 bytes : bytes20 (aligned left) : userID
	// - Next 32 bytes : uint8   (aligned left) : hashTypeID

	let result = "0x4326e22b";

	let userID_hex = userID2Hex(user_id);
	if (userID_hex.startsWith('0x') || userID_hex.startsWith('0X')) {
		userID_hex = userID_hex.substring(2);
	}

	result += userID_hex;
	result += "0000000000000000000000000000000000000000000000000000000000000000";
	//         1234567890123456789012345678901234567890123456789012345678901234
	//                 10        20        30        40        50        64  64

	return result;
}

export function extractMerkleTreeRoot(response: any): string
{
	if (!_.isObject(response)) {
		log.debug('extractMerkleTreeRoot(): not an object');
		return '';
	}

	let encoded = response.result;
	if (!_.isString(encoded)) {
		log.debug('extractMerkleTreeRoot(): response.result not a string');
		return '';
	}

	if (encoded.startsWith('0x') || encoded.startsWith('0X')) {
		encoded = encoded.substring(2);
	}

	// The response value is of type `bytes`,
	// which is a dynamically sized element.
	//
	// Data Layout:
	// - 32 bytes : Offset (of where dynamic value is stored)
	// - 32 bytes : Length of `bytes`
	// -  X bytes : Actual value
	//
	// This looks goofy and wasteful when there's only a single value,
	// but makes a little more sense when there's several parameter values being passed.
	// 
	// In our case, we passed hashTypeID==0, which is SHA256.
	// So we know the response will be: 256 bits => 32 bytes.
	// 
	// Remember: 1 byte => 2 hex characters

	if (encoded.length != (64+64+64)) {
		log.debug('extractMerkleTreeRoot(): response.result.length = '+ encoded.length);
		return '';
	}
	else {
		return encoded.substring(64+64);
	}
}

export function merkleTreeFileURL(merkle_tree_root: string): string
{
	let root = merkle_tree_root;
	if (root.startsWith('0x') || root.startsWith('0X')) {
		root = root.substring(2);
	}

	return `https://blockchain.storm4.cloud/${root}.json`;
}

export function findSelectedIdentity(
	options: {
		identities : Auth0Identity[],
		idh        : string
	}
): number|null
{
	let result: number|null = null;

	let idx = 0;
	for (const identity of options.identities)
	{
		if (idhForIdentity(identity) == options.idh) {
			result = idx;
			break;
		}
		else {
			idx++;
		}
	}

	return result;
}

/**
 * The `idh` is a query parameter that is meant to uniquely map
 * to a particular user identity. The idea is to NOT use array
 * indexes, as these could change over time. And not to fully
 * spell out the identity information because:
 * 
 * - it's potentially long
 * - it might need to be urlEncoded
 * - it leaks information
 * 
 * So a hash is used insted.
**/
export function idhForIdentity(identity: Auth0Identity): string
{
	const auth0_id = `${identity.provider}|${identity.user_id}`;
	const hash = hasha(auth0_id, {algorithm: 'sha1'});

	const subhash = hash.substring(0, 8);

	return subhash;
}

export function randomEncryptionKey(): Uint8Array
{
	const crypto: Crypto = window.crypto || (window as any).msCrypto;

	const encryption_key = new Uint8Array(512 / 8);
	crypto.getRandomValues(encryption_key);

	return encryption_key;
}

export function randomFileName(): string
{
	return randomZBase32String(32);
}

export function randomZBase32String(length: number): string
{
	const alphabet = "ybndrfg8ejkmcpqxot1uwisza345h769";
	return randomString(alphabet, length);
}

export function randomHexString(
	length: number
): string
{
	const alphabet = "0123456789ABCDEF";
	return randomString(alphabet, length);
}

function randomString(
	alphabet : string,
	length   : number
): string
{
	const alphabet_length = alphabet.length;
	let result = "";

	for (let i = 0; i < length; i++)
	{
		const random = Math.random();
		const index = Math.floor(random * alphabet_length);

		result += alphabet[index];
	}

	return result;
}

export function makeCloudFileHeader(
	options: {
		byteLength_metadata  : number,
		byteLength_thumbnail : number,
		byteLength_data      : number
	}
): ArrayBuffer
{
	/**
	 * typedef struct {
	 *   uint64_t magic;
	 *   
	 *   uint64_t metadataSize;
	 *   uint64_t thumbnailSize;
	 *   uint64_t dataSize;
	 *   
	 *   uint64_t thumbnailxxHash64;
	 *   
	 *   uint8_t  version;
	 *   uint8_t  reserved[23];
	 *   
	 * } S4CloudFileHeaderInfo;
	 * 
	 * magic = 0x286F202928206F29
	**/

	const buffer = new ArrayBuffer(64);
	const data_view = new DataView(buffer);

	const endian = false; // true:little-endian, false:big-endian

	let offset = 0;
	
	const magic = ['28', '6F', '20', '29', '28', '20', '6F', '29'];
	for (const hex of magic)
	{
		data_view.setUint8(offset, parseInt(hex, 16)); offset+=(8/8);
	}
	
	data_view.setUint32(offset, 0, endian); offset+=(32/8);
	data_view.setUint32(offset, options.byteLength_metadata, endian); offset+=(32/8);

	data_view.setUint32(offset, 0, endian); offset+=(32/8);
	data_view.setUint32(offset, options.byteLength_thumbnail, endian); offset+=(32/8);

	data_view.setUint32(offset, 0, endian); offset+=(32/8);
	data_view.setUint32(offset, options.byteLength_data, endian); offset+=(32/8);

	data_view.setUint32(offset, 0, endian); offset+=(32/8);
	data_view.setUint32(offset, 0, endian); offset+=(32/8);

	for (let i=0; i<24; i++)
	{
		data_view.setUint8(offset, 0); offset+=(8/8);
	}

	return buffer;
}

/**
 * Array elements that are null|undefined are ignored.
**/
export function concatBuffers(buffers: Array<ArrayBuffer|null|undefined>): Uint8Array
{
	const totalByteLength = buffers.reduce<number>((total, buffer)=> {
		return total + ((buffer == null) ? 0 : buffer.byteLength);
	}, 0);

	const result = new Uint8Array(totalByteLength);
	let offset = 0;

	for (const buffer of buffers)
	{
		if (buffer != null)
		{
			const temp = new Uint8Array(buffer);

			result.set(temp, offset);
			offset += temp.length;
		}
	}

	return result;
}
