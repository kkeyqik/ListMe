
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing env vars');
    return;
  }

  // Find Kanha
  const fetchUsers = await fetch(supabaseUrl + '/rest/v1/profiles?name=eq.Kanha', {
    headers: {
      'apikey': serviceKey,
      'Authorization': 'Bearer ' + serviceKey,
      'Content-Type': 'application/json'
    }
  });
  
  const users = await fetchUsers.json();
  console.log('Found users:', users.map((u: any) => ({ id: u.id, name: u.name, role: u.role })));

  for (const user of users) {
    console.log('Updating user:', user.id);
    const updateRes = await fetch(supabaseUrl + '/rest/v1/profiles?id=eq.' + user.id, {
      method: 'PATCH',
      headers: {
        'apikey': serviceKey,
        'Authorization': 'Bearer ' + serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ role: 'SUPER_ADMIN' })
    });

    const result = await updateRes.json();
    console.log('Update result:', result);
  }
}
main().catch(console.error);

