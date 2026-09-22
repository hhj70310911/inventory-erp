import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { execute, ErpError } from '@/lib/erp/service';
import { snapshot } from '@/lib/erp/read';
import { Prisma } from '@prisma/client';
export const dynamic='force-dynamic';
export async function GET(){
 const session=await auth();if(!session?.user?.id)return NextResponse.json({error:'請先登入'},{status:401});
 try{return NextResponse.json(await snapshot(session.user.id));}catch(e){return NextResponse.json({error:e instanceof ErpError?e.message:'資料讀取失敗，請確認資料庫已初始化'},{status:e instanceof ErpError?403:500});}
}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'請求來源不符'},{status:403});
 const session=await auth();if(!session?.user?.id)return NextResponse.json({error:'請先登入'},{status:401});
 try{const {requestKey,...input}=await request.json();const id=await execute(session.user.id,requestKey,input);return NextResponse.json({id});}
 catch(e){return NextResponse.json({error:e instanceof ErpError?e.message:e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2002'?'編碼或 Email 已存在':'操作失敗，資料未變更；請確認輸入後重試'},{status:400});}
}
