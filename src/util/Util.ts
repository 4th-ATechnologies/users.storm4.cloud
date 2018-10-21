import * as _ from 'lodash';
import hasha from 'hasha';

import {TextEncoder} from 'text-encoding-utf-8'

import * as api_gateway from './APIGateway';
import * as base32 from '../util/Base32Decode';

import {Logger} from '../util/Logging'

import {
	S4,
	S4HashAlgorithm,
	S4CipherAlgorithm,
	S4Property
} from './S4';

import {
	PubKey,
	IdentityProvider,
	UserInfo,
	Auth0Identity
} from '../models/models'

export const contract_address = "0x997715D0eb47A50D7521ed0D2D023624a4333F9A";

export const functionSig_addMerkleTreeRoot = "0x12e36530";
export const functionSig_getUserInfo       = "0x829a34c6";
export const functionSig_getMerkleTreeRoot = "0xee94c797";
export const functionSig_getBlockNumber    = "0x47378145";

const log = (process.env.REACT_APP_STAGE == "dev") ?
	Logger.Make('Util', 'debug') :
	Logger.Make('Util', 'info');

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
				to   : contract_address,
				data : transactionData(user_id)
			},
			"latest"
		]
	}
}

export function ensureHexPrefix(str: string): string
{
	if (str.startsWith('0x')) {
		return str;
	}
	if (str.startsWith('0X')) {
		return ('0x'+ str.substring(2));
	}

	return ('0x'+ str);
}

export function stripHexPrefix(str: string): string
{
	if (str.startsWith("0x") || str.startsWith("0X")) {
		return str.substring(2);
	}

	return str;
}

export function transactionData(user_id: string): string
{
	const user_id_hex = stripHexPrefix(userID2Hex(user_id));
	
	// function getMerkleTreeRoot(bytes20 userID)
	// 
	// Data layout:
	//
	// - First 4 bytes : Function signature
	// - Next 32 bytes : bytes20 (aligned left) : userID
	// 
	// Note:
	// 1 byte == 2 hex characters
	// 32 bytes == 64 hex chacters

	let tx_data = functionSig_getMerkleTreeRoot;
	tx_data += _.padEnd(user_id_hex, 64, '0');

	return tx_data;
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

	encoded = stripHexPrefix(encoded);

	// function getMerkleTreeRoot(...) public view returns (bytes32)
	// 
	// The response value is of type `bytes32`.
	//
	// Data Layout:
	// - 32 bytes : Actual value
	// 
	// Remember: 1 byte => 2 hex characters

	if (encoded.length != 64)
	{
		log.debug('extractMerkleTreeRoot(): response.result.length = '+ encoded.length);
		return '';
	}

	const root = encoded.substring(0, 64);

	if (root == _.padEnd('0', 64, '0')) {
		return '';
	}
	else {
		return root;
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
): Uint8Array
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

	return new Uint8Array(buffer);
}

/**
 * Array elements that are null|undefined are ignored.
**/
export function concatBuffers(buffers: Array<Uint8Array|null>): Uint8Array
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
			result.set(buffer, offset);
			offset += buffer.length;
		}
	}

	return result;
}

export function encryptData(
	options: {
		s4             : S4,
		cleartext      : Uint8Array,
		encryption_key : Uint8Array
	}
): Uint8Array|Error
{
	const {s4, cleartext, encryption_key} = options;

	let cipher_algorithm: S4CipherAlgorithm|null = null;
	switch (encryption_key.length)
	{
		case 32: cipher_algorithm = S4CipherAlgorithm.AES128;     break;
		case 64: cipher_algorithm = S4CipherAlgorithm.TWOFISH256; break;
	}

	if (cipher_algorithm == null)
	{
		const err_msg = "Unexpected encryption_key.length: "+ encryption_key.length;
		log.err(err_msg);

		return new Error(err_msg);
	}

	const iv = new Uint8Array(
		encryption_key.buffer,
		encryption_key.length / 2,
		encryption_key.length / 2);
	
	const encrypted_data = s4.cbc_encryptPad({
		algorithm : cipher_algorithm,
		key       : encryption_key,
		iv        : iv,
		input     : cleartext
	});

	if (encrypted_data == null)
	{
		const err_msg = s4.err_str() || "Unknown s4 error";
		log.err(err_msg);

		return new Error(err_msg);
	}

	const checksum = generateChecksumPrefix(options);
	if (_.isError(checksum)) {
		return checksum;
	}

	const result = concatBuffers([checksum, encrypted_data]);
	return result;
}

export function decryptData(
	options: {
		s4             : S4,
		ciphertext     : Uint8Array,
		encryption_key : Uint8Array
	}
): Uint8Array|Error
{
	const {s4, ciphertext, encryption_key} = options;

	let cipher_algorithm: S4CipherAlgorithm|null = null;
	switch (encryption_key.length)
	{
		case 32: cipher_algorithm = S4CipherAlgorithm.AES128;     break;
		case 64: cipher_algorithm = S4CipherAlgorithm.TWOFISH256; break;
	}

	if (cipher_algorithm == null)
	{
		const err_msg = "Unexpected encryption_key.length: "+ encryption_key.length;
		log.err(err_msg);

		return new Error(err_msg);
	}

	const iv = new Uint8Array(
		encryption_key.buffer,
		encryption_key.length / 2,
		encryption_key.length / 2);

	// The first 4 bytes are part of the hash,
	// which acts as an error detection system.
	// 
	const input = new Uint8Array(ciphertext.buffer, 4);

	const decrypted_data = s4.cbc_decryptPad({
		algorithm : cipher_algorithm,
		key       : encryption_key,
		iv        : iv,
		input     : input
	});

	if (decrypted_data == null)
	{
		const err_msg = s4.err_str() || "Unknown s4 error";
		log.err(err_msg);

		return new Error(err_msg);
	}

	const checksum = generateChecksumPrefix({s4, cleartext: decrypted_data, encryption_key});
	if (_.isError(checksum)) {
		return checksum;
	}

	// No memcmp() ?!?!?
	// Seriously javascript...
	// 
	if (checksum[0] != ciphertext[0] ||
	    checksum[1] != ciphertext[1] ||
	    checksum[2] != ciphertext[2] ||
	    checksum[3] != ciphertext[3]  )
	{
		const err_msg = "Corrupt data or incorrect key";
		log.err(err_msg);

		return new Error(err_msg);
	}

	return decrypted_data;
}

function generateChecksumPrefix(
	options: {
		s4             : S4,
		cleartext      : Uint8Array,
		encryption_key : Uint8Array
	}
): Uint8Array|Error
{
	const {s4, cleartext, encryption_key} = options;

	// When the recipient goes to decrypt this data,
	// we need a way to detect if the wrong encryption key was used.
	// 
	// So here's what we do:
	// - We hash the cleartext using a simple hash algorithm.
	// - Then we XOR the hash with a small portion of the encryption key.
	// - Then we append this to the front of encrypted data.
	// 
	// During decryption we can reverse this process to ensure
	// that we were able to properly decrypt the data.

	const hash = s4.hash_do(S4HashAlgorithm.xxHash32, cleartext);
	if (hash == null)
	{
		const err_msg = s4.err_str() || "Unknown s4 error";
		log.err(err_msg);

		return new Error(err_msg);
	}

	const hash_view = new DataView(hash.buffer);
	const hash_number = hash_view.getUint32(/*offset:*/0, /*littleEndian:*/true);

	const key_view = new DataView(encryption_key.buffer);
	const key_number = key_view.getUint32(/*offset:*/0, /*littleEndian:*/false); // convert from big endian
	
	const checksum = hash_number ^ key_number;

	const checksum_buffer = new ArrayBuffer(4);
	const checksum_view = new DataView(checksum_buffer);

	checksum_view.setUint32(/*offset:*/0, /*value:*/checksum, /*littleEndian:*/false);

	return new Uint8Array(checksum_buffer);
}

export function wrapSymmetricKey(
	options: {
		s4            : S4,
		public_key    : PubKey,
		symmetric_key : Uint8Array,
	}
): Uint8Array|Error
{
	const {s4, public_key, symmetric_key} = options;

	let context_key: number|null = null;
	let context_tbc: number|null = null;

	const pubKey_str = JSON.stringify(public_key, null, 0);
	const pubKey_data = TextEncoder().encode(pubKey_str);

	context_key = s4.key_deserializeKey(pubKey_data);
	if (context_key == null)
	{
		const err_msg = s4.err_str() || "Unable to deserialize user's public key";
		log.err(err_msg);

		return _cleanup(new Error(err_msg));
	}

	let cipher_algorithm: S4CipherAlgorithm|null = null;
	switch (symmetric_key.byteLength * 8)
	{
		case  256: cipher_algorithm = S4CipherAlgorithm.THREEFISH256;  break;
		case  512: cipher_algorithm = S4CipherAlgorithm.THREEFISH512;  break;
		case 1024: cipher_algorithm = S4CipherAlgorithm.THREEFISH1024; break;
	}

	if (cipher_algorithm == null)
	{
		const err_msg = "Unexpected symmetric_key.length: "+ symmetric_key.length;
		log.err(err_msg);

		return _cleanup(new Error(err_msg));
	}

	context_tbc = s4.key_newTBC(cipher_algorithm, symmetric_key);
	if (context_tbc == null)
	{
		const err_msg = s4.err_str() || "Unable to initialize TBC.";
		log.err("s4.key_newTBC(): "+ err_msg);

		return _cleanup(new Error(err_msg));
	}

	const wrapped = s4.key_wrapToKey(context_key, context_tbc);
	if (wrapped == null)
	{
		const err_msg = s4.err_str() || "Error wrapping symmetric key.";
		log.err("s4.key_wrapToKey(): "+ err_msg);
		
		return _cleanup(new Error(err_msg));
	}
	else
	{
		return _cleanup(wrapped);
	}

	function _cleanup(result: Uint8Array|Error): Uint8Array|Error 
	{
		if (context_key) { s4.key_free(context_key); }
		if (context_tbc) { s4.key_free(context_tbc); }

		return result;
	}
}
