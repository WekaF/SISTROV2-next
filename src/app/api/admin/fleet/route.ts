import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const res = await aspnetFetchServer('/api/Armada/Data', token);
    if (!res.ok) throw new Error("Failed to fetch fleet from API");

    let allFleet: any[] = await res.json();
    if (search) {
      const s = search.toLowerCase();
      allFleet = allFleet.filter(f => 
        (f.nopol || f.Nopol)?.toLowerCase().includes(s) || 
        (f.transportername || f.TransporterName)?.toLowerCase().includes(s)
      );
    }

    return NextResponse.json({ success: true, data: allFleet.map(f => ({
      ...f,
      nopol: f.nopol || f.Nopol,
      transportername: f.transportername || f.TransporterName || f.Transporter,
      axlename: f.axlename || f.Sumbu || f.SumbuName
    }))});
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const token = (session?.user as any)?.aspnetToken as string;

    const res = await aspnetFetchServer('/api/Armada/ChangeDataBaru', token, {
      method: 'POST',
      body: JSON.stringify({
        Nopol: body.Nopol,
        IsVerified: body.IsVerified,
        ExpiryDate: body.ExpiryDate
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Fleet updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const nopol = searchParams.get('nopol');
    const token = (session?.user as any)?.aspnetToken as string;

    const res = await aspnetFetchServer('/api/Armada/DeleteData', token, {
      method: 'POST',
      body: JSON.stringify({ nopol })
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Fleet deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
