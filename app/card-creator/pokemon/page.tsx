import type { Metadata } from 'next';
import PokemonEditor from './PokemonEditor';
export const metadata:Metadata={title:'Pokémon Card Creator',description:'Create a custom Pokémon card with browser-local artwork.'};
export default function PokemonCardCreatorPage(){return <PokemonEditor/>;}
