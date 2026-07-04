import { TicketBookingDetail } from "@/components/ticket/TicketBookingDetail";

interface TicketBookingDetailPageProps {
  params: Promise<{ guid: string }>;
}

export default async function TicketBookingDetailPage({ params }: TicketBookingDetailPageProps) {
  const { guid } = await params;
  return <TicketBookingDetail guid={guid} />;
}
