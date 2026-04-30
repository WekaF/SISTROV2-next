import { TicketPrintDocument } from "@/components/ticket/TicketPrintDocument";

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function PrintPage({ params }: PrintPageProps) {
  const { id } = await params;
  
  return <TicketPrintDocument id={id} />;
}
