import { z } from 'zod';
export const passwordSchema=z.string().min(8,'密碼至少需要 8 碼').max(72,'密碼過長').refine(v=>Buffer.byteLength(v,'utf8')<=72,'密碼 UTF-8 長度不可超過 72 位元組');
