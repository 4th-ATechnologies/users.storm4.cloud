import * as _ from 'lodash';
import * as LRU from 'lru-cache';

import * as api_gateway from './APIGateway';

import {Logger} from '../util/Logging'

import {
	UserInfo,
	Auth0Profile,
	UserProfile
} from '../models/users'

const log = Logger.Make('debug', 'UsersCache');

const global_cache = new LRU<string, UserProfile>({
	max    : 1000,
	maxAge : (1000 * 60 * 5) // 5 minutes
});

export function addToCache(
	user_profile : UserProfile
): void
{
	const copy = _.cloneDeep(user_profile);
	global_cache.set(copy.s4.user_id, copy);
}

export function fetchUserProfile(
	user_id  : string,
	callback : (
		err           : Error|null,
		status_code  ?: number,
		user_profile ?: UserProfile
	)=> void
): void
{
	const cached = global_cache.get(user_id);
	if (cached)
	{
		const copy = _.cloneDeep(cached);
		setImmediate(()=> {
			callback(null, 200, copy);
		});
		return;
	}

	const host = api_gateway.getHost();
	const path = api_gateway.getPath(`/users/info/${user_id}`);

	const url = `https://${host}${path}`;
	
	fetch(url, {
		method: "GET"

	}).then((response)=> {

		if (response.status != 200)
		{
			callback(null, response.status);
			return;
		}
		
		return response.json();
	
	}).then((json)=> {
		
		if (_.isObject(json) &&
			 _.isString(json.user_id) &&
			 _.isString(json.bucket) &&
			_.isString(json.region) &&
			_.isObject(json.auth0))
		{
			const user_info: UserInfo = {
				user_id : json.user_id,
				region  : json.region,
				bucket  : json.bucket
			};
			const auth0_profile = json.auth0 as Auth0Profile;

			const user_profile: UserProfile = {
				s4    : user_info,
				auth0 : auth0_profile
			};

			const copy = _.cloneDeep(user_profile);
			global_cache.set(copy.s4.user_id, copy);

			callback(null, 200, user_profile);
		}
		else
		{
			// Malformed server response ?!?
			callback(null, 500);
		}

	}).catch((reason)=> {

		log.debug(`Error fetching user_profile for ${user_id}: ${reason}`);

		callback(reason);
	});
}
