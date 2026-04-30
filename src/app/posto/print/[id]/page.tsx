import { BookingPrintDocument } from "@/components/ticket/BookingPrintDocument";

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function PostoPrintPage({ params }: PrintPageProps) {
  const { id } = await params;
  
  return <BookingPrintDocument id={id} />;
}
