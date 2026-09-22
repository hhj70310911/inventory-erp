import { PrismaClient } from '@prisma/client';
import { passwordSchema } from '../src/lib/erp/password-policy';
import bcrypt from 'bcryptjs';
import { assertDatabaseTarget } from '../src/lib/database-target';
assertDatabaseTarget();
const prisma = new PrismaClient();
async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || !passwordSchema.safeParse(password).success) throw Error('Set ERP administrator credentials; password must have at least 8 characters (maximum 72 UTF-8 bytes).');
  if (await prisma.user.findUnique({where:{email}})) {
    console.log('Account exists; password and role unchanged.'); return;
  }
  await prisma.user.create({data:{email,passwordHash:await bcrypt.hash(password,12),role:'ADMIN'}});
  console.log('ERP administrator created.');
}
main().catch(()=>{console.error('ERP initialization failed. Check credentials and migrations.');process.exitCode=1;}).finally(()=>prisma.$disconnect());
