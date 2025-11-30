import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/lib/api';
import { authOptions } from '@/lib/auth';
import ProfileContent from '@/components/ProfileContent';

export const revalidate = 0;

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/auth/signin?callbackUrl=/profile');
  }

  let profile = null;
  try {
    profile = await getUserProfile(session.user.email);
  } catch (error) {
    console.error('Failed to fetch profile:', error);
  }

  return (
    <ProfileContent
      profile={profile}
      session={session}
    />
  );
}
