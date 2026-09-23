const {spawn}=require('node:child_process');
require('@next/env').loadEnvConfig(process.cwd(),true);
if(!['development','test'].includes(process.env.ERP_ENVIRONMENT))throw Error('Preview requires a development/test database.');
const target=new URL(process.env.DATABASE_URL);
if(target.host+target.pathname!==process.env.ERP_DATABASE_TARGET)throw Error('Database target mismatch.');
const base='http://127.0.0.1:3100';
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3100'],{stdio:'inherit',env:{...process.env,NODE_ENV:'production',NEXTAUTH_URL:base,AUTH_URL:base}});
child.on('exit',code=>{process.exitCode=code||0;});
process.on('SIGINT',()=>child.kill());process.on('SIGTERM',()=>child.kill());
