/**
 * To run this script:
 * $ node ./scripts/prebuild.js
**/

const shell = require('shelljs');

shell.config.fatal = true;

const stage = "prod";
console.log(`Configuring target AWS stage for: ${stage}...`);
 
// ln([options,] source, dest)
// 
console.log(`ln -sf .env.${stage} .env`);
shell.ln('-sf', `.env.${stage}`, '.env');
