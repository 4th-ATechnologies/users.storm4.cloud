/**
 * Run this script via one of the following:
 * 
 * $ npm run homepage -- --dst [prod, beta]
 * $ node scripts/homepage --dst [prod, beta]
**/

const fs = require('fs');
const program = require('commander');
const shell = require('shelljs');

shell.config.fatal = true;

// Extract & verify parameters

program
  .option('--dst [value]', 'The destination: [prod, beta]')
  .parse(process.argv);

const PROJECT_NAME = "users";
let homepage = null;
switch ((program.dst || "").toLowerCase())
{
	case "prod" :
	case `${PROJECT_NAME}`:
	case `${PROJECT_NAME}.storm4.cloud`: {
		homepage = `https://${PROJECT_NAME}.storm4.cloud`;
		break;
	}
	case "beta": 
	case `${PROJECT_NAME}beta`:
	case `${PROJECT_NAME}beta.storm4.cloud`: {
		homepage = `https://${PROJECT_NAME}beta.storm4.cloud`;
		break;
	}
}

if (homepage == null) {
	console.log("Invalid dst !");
	shell.exit(1);
	return;
}

try {
	console.log(`Checking package.json homepage. Expecting: '${homepage}'`);

	const packageJsonPath = './package.json';

	const packageJsonStr = fs.readFileSync(packageJsonPath, {encoding: 'utf8'});
	const packageJson = JSON.parse(packageJsonStr);

	if (packageJson.homepage != homepage)
	{
		console.log(`Updating package.json homepage to '${homepage}'...`);

		packageJson.homepage = homepage;
		const newPackageJsonStr = JSON.stringify(packageJson, null, '\t');

		fs.writeFileSync(packageJsonPath, newPackageJsonStr, {encoding: 'utf8'});
	}

} catch (e) {
	console.error("Error setting homepage: "+ e);
	shell.exit(1);
	return;
}
