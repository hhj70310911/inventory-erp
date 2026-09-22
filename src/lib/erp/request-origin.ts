// Next.js may use an internal hostname for request.url. Compare the browser's
// origin with the actual Host header and protocol supplied by the hosting proxy.
export function isSameOrigin(request:Request){
 const origin=request.headers.get('origin');if(!origin)return false;
 try{
  const url=new URL(request.url);const expectedHost=request.headers.get('host')||url.host;
  const protocol=request.headers.get('x-forwarded-proto')||url.protocol.slice(0,-1);
  if(!['http','https'].includes(protocol))return false;
  return new URL(origin).origin===new URL(`${protocol}://${expectedHost}`).origin;
 }catch{return false;}
}
