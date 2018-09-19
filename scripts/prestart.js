/**
 * To run this script:
 * $ node ./scripts/prestart.js
**/

const shell = require('shelljs');

shell.config.fatal = true;

const stage = "dev"; // <= Change this to: [dev, test, prod]
console.log(`Configuring environment for: ${stage}...`);
 
// ln([options,] source, dest)
// 
console.log(`ln -sf .env.${stage} .env`);
shell.ln('-sf', `.env.${stage}`, '.env');
