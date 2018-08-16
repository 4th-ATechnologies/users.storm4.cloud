'use strict';

export function getStage(): string
{
	let stage = process.env.REACT_APP_STAGE;
	if (stage == null) {
		stage = "prod";
	}

	return stage;
}

export function getAPIGatewayID(): string
{
	switch (getStage())
	{
		case "dev" : return "pzg66sum7l";
		case "test": return "xvsiisz5m0";
		default    : return "4trp9uu0h1";
	}
}

export function getHost(): string
{
	return (getAPIGatewayID() +".execute-api.us-west-2.amazonaws.com");
}

export function getPath(path: string): string
{
	let prefix = "/"+ getStage();
	if (!path.startsWith('/')) {
		prefix = prefix + '/';
	}

	return (prefix + path);
}