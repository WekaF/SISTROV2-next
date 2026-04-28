"use client";
import React, { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Bug } from "lucide-react";

export default function DebugApiPage() {
  const { apiJson } = useApi();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: session } = useSession();
  const companyCode = (session?.user as any)?.companyCode;

  const testTiket = async (variation = 1) => {
    setLoading(true);
    setError(null);
    try {
      let body: any = {
        draw: 1,
        start: 0,
        length: 10,
        search: { value: "" }
      };

      if (variation === 2) {
        body.companyCode = companyCode;
      }

      if (variation === 3) {
        body = {
          Draw: 1,
          Start: 0,
          Length: 10,
          Search: { Value: "" },
          companyCode: companyCode
        };
      }

      if (variation === 4) {
        const params = new URLSearchParams();
        params.append("draw", "1");
        params.append("start", "0");
        params.append("length", "10");
        params.append("search[value]", "");
        if (companyCode) params.append("companyCode", companyCode);

        const data = await apiJson("/api/Tiket/DataTableFilter", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString()
        });
        setResult(data);
        setLoading(false);
        return;
      }

      const data = await apiJson("/api/Tiket/DataTableFilter", {
        method: "POST",
        body: JSON.stringify(body)
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testTiketAktif = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson("/api/Tiket/Aktif", {
        method: "GET"
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testPosto = async (variation = 1) => {
    setLoading(true);
    setError(null);
    try {
      if (variation === 4) {
        const params = new URLSearchParams();
        params.append("draw", "1");
        params.append("start", "0");
        params.append("length", "10");
        params.append("search[value]", "");
        if (companyCode) params.append("companyCode", companyCode);

        const data = await apiJson("/api/POSTO/DataTableFilter", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString()
        });
        setResult(data);
        setLoading(false);
        return;
      }

      const body = {
        draw: 1,
        start: 0,
        length: 10,
        search: { value: "" },
        companyCode: companyCode
      };
      const data = await apiJson("/api/POSTO/DataTableFilter", {
        method: "POST",
        body: JSON.stringify(body)
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Bug className="h-8 w-8 text-rose-500" />
        <h1 className="text-2xl font-black uppercase tracking-tight">API Diagnostic Tool</h1>
      </div>

      <div className="flex flex-wrap gap-4">
        <Button onClick={() => testTiket(1)} disabled={loading} variant="default">
          {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
          Test Tiket (v1: Basic)
        </Button>
        <Button onClick={() => testTiket(2)} disabled={loading} variant="outline" className="border-brand-500 text-brand-500">
          {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
          Test Tiket (v2: +CompanyCode)
        </Button>
        <Button onClick={() => testTiket(3)} disabled={loading} variant="outline" className="border-emerald-500 text-emerald-500">
          {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
          Test Tiket (v3: PascalCase)
        </Button>
        <Button onClick={() => testTiket(4)} disabled={loading} variant="outline" className="border-amber-500 text-amber-500">
          {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
          Test Tiket (v4: Form Data)
        </Button>
        <Button onClick={testTiketAktif} disabled={loading} variant="secondary">
          {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
          Test Tiket (GET: /Aktif)
        </Button>
        <Button onClick={() => testPosto(1)} disabled={loading} variant="secondary">
          {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
          Test Posto (JSON)
        </Button>
        <Button onClick={() => testPosto(4)} disabled={loading} variant="outline" className="border-amber-500 text-amber-500">
          {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
          Test Posto (Form Data)
        </Button>
      </div>

      {error && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4 text-rose-700 font-mono text-sm">
            Error: {error}
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase text-gray-400">Raw JSON Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-900 text-emerald-400 p-6 rounded-xl overflow-auto max-h-[600px] text-xs font-mono">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
