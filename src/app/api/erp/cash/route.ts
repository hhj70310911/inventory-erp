import {NextResponse} from 'next/server';
import {auth} from '@/auth';
import {isSameOrigin} from '@/lib/erp/request-origin';
import {cashRead,cashExecute} from '@/lib/erp/cash';
import {ErpError} from '@/lib/erp/service';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const session=await auth();if(!session?.user?.id)return NextResponse.json({error:'請先登入'},{status:401});
 const q=new URL(request.url).searchParams;
 try{return NextResponse.json(await cashRead(session.user.id,q.get('month')||'',q.get('summary')==='1'));}
 catch(e){return NextResponse.json({error:e instanceof ErpError?e.message:'收支讀取失敗，請重試'},{status:e instanceof ErpError?403:500});}
}
export async function POST(request:Request){
 if(!isSameOrigin(request))return NextResponse.json({error:'請求來源不符'},{status:403});
 const session=await auth();if(!session?.user?.id)return NextResponse.json({error:'請先登入'},{status:401});
 try{const {requestKey,...input}=await request.json();return NextResponse.json({id:await cashExecute(session.user.id,requestKey,input)});}
 catch(e){return NextResponse.json({error:e instanceof ErpError?e.message:'儲存失敗，請重新整理後重試'},{status:400});}
}
