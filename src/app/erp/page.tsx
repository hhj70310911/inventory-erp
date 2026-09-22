import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Workspace from './workspace';
export const dynamic='force-dynamic';
export default async function Page(){const session=await auth();if(!session?.user?.id)redirect('/login');return <Workspace/>;}
