declare module 'aws4' {

	export interface SignResult {
		host     : string
		path     : string,
		body    ?: string,
		headers  : {
			"X-Amz-Security-Token" : string,
			"X-Amz-Date"           : string,
			"Authorization"        : string,
			[key: string]          : string
		}
	}

	export function sign(
		options: {
			host     : string,
			path     : string,
			method   : string,
			body    ?: string,
			headers  : {
				[key: string]: string
			}
		},
		credentials: {
			accessKeyId      : string,
			secretAccessKey  : string,
			sessionToken    ?: string
		}
	): SignResult;
}