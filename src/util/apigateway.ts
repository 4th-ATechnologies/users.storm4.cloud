'use strict';

export function getStage(): string
{
	let stage = process.env.REACT_APP_STAGE;
	if (stage == null) {
		stage = "prod";
	}

	return stage;
}

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

export function getPath(path: string): string
{
	let prefix = "/"+ getStage();
	if (!path.startsWith('/')) {
		prefix = prefix + '/';
	}

	return (prefix + path);
}