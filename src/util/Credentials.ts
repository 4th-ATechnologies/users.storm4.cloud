'use strict';

import * as _ from 'lodash';
import {Credentials as AWSCredentials} from 'aws-sdk';

import * as apiGateway from './APIGateway';
import {Logger} from '../util/Logging'

const log = Logger.Make('debug', 'Credentials');

interface CredentialsResponse {
	ResponseMetadata: {
		RequestId : string	
	},
	Credentials: {
		AccessKeyId: string,
		SecretAccessKey: string,
		SessionToken: string,
		Expiration: string
	},
	AssumedRoleUser: {
		AssumedRoleId: string,
		Arn: string
	}
}

let cached_credentials: CredentialsResponse|null = null;

export function getCredentials(
	callback : (
		err          : Error|null,
		credentials ?: AWSCredentials
	)=> void
): void
{
	if (cached_credentials)
	{
		const nowPlusBuffer = Date.now() + (1000 * 60 * 15); // 15 minutes
		const expire = new Date(cached_credentials.Credentials.Expiration);

		log.debug("cached_credentials: expire: "+ expire);

		if (expire.valueOf() > nowPlusBuffer)
		{
			// We've still got at least 15 minutes to perform the next upload.
			// So let's go ahead and use the cached credentials again.

			const result = new AWSCredentials({
				accessKeyId     : cached_credentials.Credentials.AccessKeyId,
				secretAccessKey : cached_credentials.Credentials.SecretAccessKey,
				sessionToken    : cached_credentials.Credentials.SessionToken
			});
			result.expireTime = expire;

			setImmediate(()=> {
				callback(null, result);
			});
			return;
		}
	}

	const host = apiGateway.getHost();
	const path = apiGateway.getPath("/delegation");

	const url = `https://${host}${path}`;

	const wtf: Promise<any> = fetch(url, {
		method : "GET"

	}).then((response)=>{

		if (response.status != 200) {
			throw new Error("Server returned status code: "+ response.status);
		}

		return response.json();

	}).then((json: CredentialsResponse)=> {

		if (_.isObject(json) &&
			 _.isObject(json.Credentials) &&
			 _.isString(json.Credentials.AccessKeyId) &&
			 _.isString(json.Credentials.SecretAccessKey) &&
			 _.isString(json.Credentials.SessionToken) &&
		    _.isString(json.Credentials.Expiration))
		{
			cached_credentials = json;

			const result = new AWSCredentials({
				accessKeyId     : cached_credentials.Credentials.AccessKeyId,
				secretAccessKey : cached_credentials.Credentials.SecretAccessKey,
				sessionToken    : cached_credentials.Credentials.SessionToken
			});
			result.expireTime = new Date(json.Credentials.Expiration);

			callback(null, result);
		}
		else
		{
			throw new Error("Server returned malformed response");
		}

	}).catch((reason)=> {

		callback(reason);
	});
}

