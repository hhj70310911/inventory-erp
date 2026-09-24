import { NextResponse, type NextRequest } from 'next/server';
// This copy is an ERP. Block legacy storefront pages and their server actions.
export function middleware(request:NextRequest){
 const p=request.nextUrl.pathname;
 if(p==='/'||p==='/erp'||p==='/login'||p==='/api/erp'||p==='/api/erp/password'||p==='/api/erp/documents'||p.startsWith('/api/auth/'))return NextResponse.next();
 return new NextResponse('此功能已在 ERP 停用',{status:404});
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
