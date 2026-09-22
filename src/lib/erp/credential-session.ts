import { createHmac, timingSafeEqual } from 'node:crypto';
export function credentialStamp(hash:string){
 const secret=process.env.AUTH_SECRET;
 if(!secret)throw new Error('AUTH_SECRET is required');
 return createHmac('sha256',secret).update(hash).digest('hex');
}
export function matchesCredential(stamp:unknown,hash:string){
 if(typeof stamp!=='string'||!/^[a-f0-9]{64}$/.test(stamp))return false;
 return timingSafeEqual(Buffer.from(stamp,'hex'),Buffer.from(credentialStamp(hash),'hex'));
}
