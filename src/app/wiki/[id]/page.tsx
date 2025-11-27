import { notFound } from 'next/navigation';
import {getWikiDoc} from "@/client/database";
import {Wiki} from "@/components/Wiki";

export default async function WikiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wikiDoc = await getWikiDoc(id);

  if (!wikiDoc) {
    notFound();
  }

  return <Wiki data={wikiDoc} />
}
