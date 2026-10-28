import { permanentRedirect } from 'next/navigation';

// Legacy URL: a permanent (308) redirect so search engines move it to /post-property.
export default function PostPropertyRedirectPage() {
  permanentRedirect('/post-property');
}
