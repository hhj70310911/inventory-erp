const {spawnSync}=require('node:child_process');
function validate(env){
 const target=env.VERCEL_ENV;
 if(!['production','preview'].includes(target))throw Error('Use npm run build locally. This command requires a Vercel production or preview environment.');
 if(target==='production'&&env.ERP_ENVIRONMENT!=='production')throw Error('Production deployments require ERP_ENVIRONMENT=production and a dedicated production database.');
 if(target==='preview'&&!['test','development'].includes(env.ERP_ENVIRONMENT))throw Error('Preview deployments require a test/development database.');
 let url;try{url=new URL(env.DATABASE_URL);}catch{throw Error('Set the ERP DATABASE_URL in Vercel.');}
 if(!['postgres:','postgresql:'].includes(url.protocol)||!url.username||!url.password||url.host+url.pathname!==env.ERP_DATABASE_TARGET)throw Error('ERP_DATABASE_TARGET must match the database host:port/path.');
 if(!env.AUTH_SECRET||env.AUTH_SECRET.length<32)throw Error('Set a dedicated AUTH_SECRET of at least 32 characters.');
 if(env.NEXTAUTH_URL){let auth;try{auth=new URL(env.NEXTAUTH_URL);}catch{throw Error('Invalid NEXTAUTH_URL');}if(auth.protocol!=='https:'||['localhost','127.0.0.1'].includes(auth.hostname))throw Error('Cloud NEXTAUTH_URL must be the public HTTPS URL, not localhost.');}
}
module.exports={validate};
if(require.main===module){
 try{
  validate(process.env);
  const prisma=require('node:path').join(require('node:path').dirname(require.resolve('prisma/package.json')),'build','index.js');
  for(const args of [[prisma,'generate'],[require.resolve('next/dist/bin/next'),'build'],['scripts/database-command.cjs','migrate-deploy']]){
   const result=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});if(result.status!==0)process.exit(result.status||1);
  }
 }catch(e){console.error(e.message);process.exitCode=1;}
}
