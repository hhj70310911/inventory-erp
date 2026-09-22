const {spawnSync}=require('node:child_process');
// Deliberately unreachable database: compilation must finish before migrations run.
const result=spawnSync(process.execPath,[require.resolve('next/dist/bin/next'),'build'],{
 stdio:'inherit',env:{...process.env,DATABASE_URL:'postgresql://build_test:unused@127.0.0.1:1/erp_build_test?connect_timeout=1',ERP_DATABASE_TARGET:'127.0.0.1:1/erp_build_test',ERP_ENVIRONMENT:'test',AUTH_SECRET:'build-only-not-a-real-authentication-secret',NEXTAUTH_URL:'http://127.0.0.1:3100'}
});
process.exitCode=result.status??1;
