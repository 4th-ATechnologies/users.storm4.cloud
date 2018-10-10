'use strict';

/**
 * Returns the proper stage for the runtime environment.
 * This is controlled via the `.env` file in the root folder.
 * 
 * Note:
 * The following scripts automatically symlink the `.env` file:
 * - scripts/prebuild.js : `.env` -> `.env.prod`
 * - scripts/prestart.js : `.env` -> `.env.dev`
 * 
 * The following stages are supported:
 * 
 * - Dev  : Only used by 4th-A server developers. Changes daily. Highly unstable.
 * - Test : Used by 4th-A client developers. Used to test server changes. Possibly buggy.
 * - Prod : Should be used by non 4th-A engineers.
**/
export function getStage(): string
{
	let stage = process.env.REACT_APP_STAGE;
	if (stage == null) {
		stage = "prod";
	}

	return stage;
}

/**
 * Maps from region & stage to proper AWS API Gateway ID.
 * 
 * The `region` parameter is required because it depends on who you're sending files to.
 * That is, some users have their bucket in 'us-west-2' (Oregon),
 * while other users have their bucket in 'eu-west-1' (Ireland).
 * You need to supply the proper region for the target user.
**/
export function getAPIGatewayID(region: string): string
{
	switch (region)
	{
		case 'us-west-2':
		{
			switch (getStage())
			{
				case "dev" : return "pzg66sum7l";
				case "test": return "xvsiisz5m0";
				default    : return "4trp9uu0h1";
			}
		}
		case 'eu-west-1':
		{
			switch (getStage())
			{
				case "dev" : return "74bukw6pwc";
				case "test": return "3ip9q72kwf";
				default    : return "b0mf3mdmt0";
			}
		}
		default:
		{
			return "unknown";
		}
	}
}

/**
 * Returns the proper hostname for the given region.
 * 
 * The `region` parameter is required because it depends on who you're sending files to.
 * That is, some users have their bucket in 'us-west-2' (Oregon),
 * while other users have their bucket in 'eu-west-1' (Ireland).
 * You need to supply the proper region for the target user.
**/
export function getHost(region: string): string
{
	const prefix = getAPIGatewayID(region);

	let suffix: string;
	switch (region)
	{
		case 'us-west-2': suffix = ".execute-api.us-west-2.amazonaws.com"; break;
		case 'eu-west-1': suffix = ".execute-api.eu-west-1.amazonaws.com"; break;
		default         : suffix = `.execute-api.${region}.amazonaws.com`; break;
	}

	return (prefix + suffix);
}

/**
 * AWS API Gateway paths have the 'stage' embedded as the first component of the path.
 * For example:
 * 
 * - "/foo/bar" => "/prod/foo/bar"
**/
export function getPath(path: string): string
{
	let prefix = "/"+ getStage();
	if (!path.startsWith('/')) {
		prefix = prefix + '/';
	}

	return (prefix + path);
}