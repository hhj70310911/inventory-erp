import { isSameOrigin } from '@/lib/erp/request-origin';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { updatePassword } from '@/lib/erp/account';
import { ErpError } from '@/lib/erp/service';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!isSameOrigin(request))return NextResponse.json({error:'請求來源不符'},{status:403});
 const session=await auth();if(!session?.user?.id)return NextResponse.json({error:'請重新登入'},{status:401});
 try{return NextResponse.json(await updatePassword(session.user.id,await request.json()));}
 catch(e){return NextResponse.json({error:e instanceof ErpError?e.message:'密碼更新失敗，請重新整理後再試'},{status:400});}
}
