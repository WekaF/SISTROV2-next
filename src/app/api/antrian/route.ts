import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const storageID = searchParams.get('storageID');
    const token = (session?.user as any)?.aspnetToken as string;

    const res = await aspnetFetchServer('/api/Antrian/DataTable', token, {
      method: 'POST',
      body: JSON.stringify({
        Page: page,
        Length: limit,
        StorageId: storageID
      })
    });

    if (!res.ok) throw new Error("Failed to fetch queue from API");
    const data = await res.json();
    
    // Summary logic: if API doesn't provide it, we might need a separate call or aggregate from data
    // For now, returning data.data and a placeholder summary or aggregated summary
    const queueData = data.data || data;
    const summary = Array.isArray(queueData) ? Object.values(queueData.reduce((acc: any, curr: any) => {
      const id = curr.storageid || curr.StorageId;
      if (!acc[id]) acc[id] = { storageid: id, storagename: curr.storagename || curr.StorageName, queuecount: 0 };
      if (!curr.status) acc[id].queuecount++;
      return acc;
    }, {})) : [];

    return NextResponse.json({ 
      success: true, 
      data: queueData,
      summary: summary,
      pagination: { 
        total: data.recordsTotal || queueData.length, 
        page, 
        limit, 
        totalPages: Math.ceil((data.recordsTotal || queueData.length) / limit) 
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
