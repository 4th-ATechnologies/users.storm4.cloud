import * as _ from 'lodash';

import * as api_gateway from './APIGateway';

import {
	IdentityProvider,
	UserInfo,
	Auth0Identity
} from '../models/users'

/**
 * Must be a 32 character zBase32 encoded string.
**/
export function isValidUserID(str: string): boolean
{
	const regex = /^[ybndrfg8ejkmcpqxot1uwisza345h769]{32}$/;
	return regex.test(str);
}

export function profileUrlForUser(user_id: string): string
{
	const host = api_gateway.getHost();
	const path = api_gateway.getPath('/users/info');

	return `https://${host}${path}?user_id=${user_id}&identities=1`;
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
