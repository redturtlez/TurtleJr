import type { Metadata } from 'next';
import CardEditor from './CardEditor';

export const metadata: Metadata = { title: 'Yu-Gi-Oh Card Creator', description: 'Create custom Monster, Spell and Trap cards with your own artwork.' };

// Intentionally public. Existing proxy only protects /todo, /budget, and /health.
export default function CardCreatorPage() {
  return <CardEditor />;
}
