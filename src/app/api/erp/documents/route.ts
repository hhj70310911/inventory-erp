import {NextResponse} from 'next/server';
import {auth} from '@/auth';
import {orderDocument} from '@/lib/erp/order-document';
import {ErpError} from '@/lib/erp/service';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const session=await auth();if(!session?.user?.id)return NextResponse.json({error:'請先登入'},{status:401});
 const query=new URL(request.url).searchParams,orderId=query.get('orderId'),shipmentId=query.get('shipmentId');
 if(!orderId||orderId.length>100||(shipmentId!==null&&(!shipmentId||shipmentId.length>100)))return NextResponse.json({error:'單據識別無效'},{status:400});
 try{return NextResponse.json(await orderDocument(session.user.id,orderId,shipmentId||undefined),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return NextResponse.json({error:e instanceof ErpError?e.message:'單據讀取失敗，請稍後再試'},{status:400,headers:{'Cache-Control':'private, no-store'}});}
}
