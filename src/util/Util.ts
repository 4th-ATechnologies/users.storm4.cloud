

/**
 * Must be a 32 character zBase32 encoded string.
**/
export function is_valid_user_id(str: string): boolean
{
	const regex = /^[ybndrfg8ejkmcpqxot1uwisza345h769]{32}$/;
	return regex.test(str);
}
