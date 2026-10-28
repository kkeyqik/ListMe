import { permanentRedirect } from 'next/navigation';

export default function SignupRedirect() {
  permanentRedirect('/login?step=signup');
}
