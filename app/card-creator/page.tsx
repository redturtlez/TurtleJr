import type { Metadata } from 'next';
import CardEditor from './CardEditor';

export const metadata: Metadata = { title: 'Card Creator', description: 'Create custom Monster, Spell and Trap cards with your own artwork.' };

// Intentionally public. Existing middleware only protects /todo and /health.
export default function CardCreatorPage() {
  return <CardEditor />;
}
