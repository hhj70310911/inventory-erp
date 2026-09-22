const assert=require('node:assert/strict');const {validate}=require('./vercel-build.cjs');
const valid={VERCEL_ENV:'production',ERP_ENVIRONMENT:'production',DATABASE_URL:'postgresql://u:p@db.example.invalid:5432/erp',ERP_DATABASE_TARGET:'db.example.invalid:5432/erp',AUTH_SECRET:'test'.repeat(10)};
validate(valid);validate({...valid,VERCEL_ENV:'preview',ERP_ENVIRONMENT:'test'});
for(const extra of [{ERP_ENVIRONMENT:'development'},{VERCEL_ENV:'preview'},{ERP_DATABASE_TARGET:'wrong'},{AUTH_SECRET:''},{NEXTAUTH_URL:'http://127.0.0.1:3100'},{VERCEL_ENV:undefined}])assert.throws(()=>validate({...valid,...extra}));
console.log('PASS: production/preview environment guards, database endpoint and public authentication URL. No DB writes.');
