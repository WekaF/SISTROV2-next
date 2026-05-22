/**
 * POST /api/tiket/track-data
 * API Next.js yang langsung query SQL Server (SISTROSTAGING)
 * sebagai pengganti ASP.NET /api/Tiket/TrackData yang bermasalah.
 *
 * Body: { bookingno: string }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSqlPool, sql } from "@/lib/mssql-client";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    const body = await req.json();
    const bookingno: string = body?.bookingno ?? "";
    if (!bookingno) {
      return NextResponse.json({ error: "Parameter bookingno kosong" }, { status: 400 });
    }

    const pool = await getSqlPool();

    // Check if 'Antrian' table exists in the database to prevent crashes in staging/dev environments
    const tableCheck = await pool.request().query(`
      SELECT 1 FROM sys.tables WHERE name = 'Antrian'
    `);
    const hasAntrian = tableCheck.recordset.length > 0;

    let queryStr = `
        SELECT
          t.id,
          t.bookingno,
          t.tiketno,
          t.posto,
          t.idshift,
          t.tanggal,
          t.idtransport,
          t.idproduk,
          t.nopol,
          t.driver,
          t.qty,
          t.statuspemuatan,
          t.position,
          t.timesec,
          t.timekosong,
          t.timegudang,
          t.timemuat,
          t.timeisi,
          t.updatedby,
          t.updatedon,
          t.revised,
          t.validsecurity,
          t.validisi,
          t.emergencystatus,
          t.statusticket,
          t.holdreason,
          t.deletereason,
          t.pic,
          t.nomor_antrian,
          t.label_antrian,
          -- Posto fields
          p.guid           AS posto_guid,
          p.wilayah        AS postowilayah,
          p.bagian         AS postobagian,
          p.company_code   AS company,
          p.Percepatan     AS percepatan,
          p.tipe           AS tipe,
          p.qty            AS qtyPOSTO,
          -- Gudang asal & tujuan
          ga.Deskripsi     AS asal,
          gt.Deskripsi     AS tujuan,
          -- Shift
          ks.shift         AS shift,
          -- Transport
          tr.nama          AS transportString,
          -- Produk
          pd.Nama          AS produkString,
          -- Armada
          ar.jeniskendaraan AS jeniskendaraan,
          -- Company
          co.timbangan     AS timbangan,
          -- Antrian / gudang tujuan
          ${hasAntrian ? 'an.storageID' : 'NULL'}     AS antrianStorageID,
          ${hasAntrian ? 'gs.deskripsi' : 'NULL'}     AS gudangSPPT
        FROM Tiket t
        LEFT JOIN Posto p         ON t.posto        = p.noposto
        LEFT JOIN Gudang ga       ON p.asal         = ga.ID
        LEFT JOIN Gudang gt       ON p.tujuan       = gt.ID
        LEFT JOIN Kuota4Shift ks  ON t.idshift      = ks.id
        LEFT JOIN Transport tr    ON t.idtransport  = tr.kode
        LEFT JOIN Produk pd       ON t.idproduk     = pd.ID
        LEFT JOIN Armada ar       ON ar.TransportCode = t.idtransport AND ar.nopol = t.nopol
        LEFT JOIN Company co      ON p.company_code = co.company_code
    `;

    if (hasAntrian) {
      queryStr += `
        LEFT JOIN Antrian an      ON t.bookingno    = an.ticketID
        LEFT JOIN Gudang_SPPT gs  ON an.storageID   = gs.ID
      `;
    }

    queryStr += `
        WHERE t.bookingno = @bookingno OR t.tiketno = @bookingno
    `;

    // ── 1. Query tiket (tanpa filter company — track data biasanya publik untuk semua role) ──
    const tiketRes = await pool
      .request()
      .input("bookingno", sql.VarChar(50), bookingno)
      .query(queryStr);

    if (!tiketRes.recordset || tiketRes.recordset.length === 0) {
      return NextResponse.json(
        { error: "Nomor tiket tidak dikenali" },
        { status: 400 }
      );
    }

    const row = tiketRes.recordset[0];
    const co = row.company ?? "";
    const timbangan: boolean = row.timbangan === true;

    // ── 2. Query LogArmada ──
    let excludePositions: string[] = [];
    if (co === "F249") {
      excludePositions = ["02", "03", "04", "05", "06"];
    } else if (!timbangan) {
      excludePositions = ["05", "06"];
    }

    let logQuery = `
      SELECT id, ticketID, position, positioncode, updatedon, bookingno
      FROM LogArmada
      WHERE bookingno = @bookingno
    `;
    if (excludePositions.length > 0) {
      const excl = excludePositions.map((p) => `'${p}'`).join(",");
      logQuery += ` AND positioncode NOT IN (${excl})`;
    }
    logQuery += " ORDER BY updatedon ASC";

    const logRes = await pool
      .request()
      .input("bookingno", sql.VarChar(50), row.bookingno)
      .query(logQuery);

    const logList = logRes.recordset || [];
    const hasLogArmada01 = logList.some((l: any) => l.positioncode === "01");

    // Status String Helper
    const getStatusTiket = (
      bookingno: string,
      status: string | null | undefined,
      companyCode: string,
      timbangan: boolean,
      hasLogArmada01: boolean
    ): string => {
      if (!status) return "-";
      
      let resolvedStatus = status;
      
      if (!timbangan) {
        if (status === "00") {
          if (hasLogArmada01) {
            resolvedStatus = "01";
          } else {
            resolvedStatus = "00";
          }
        } else if (status === "02") {
          resolvedStatus = "01";
        } else if (status === "06") {
          if (companyCode === "F249") {
            resolvedStatus = "01";
          } else {
            resolvedStatus = "04";
          }
        }
      }

      switch (resolvedStatus) {
        case "00": return "Tiket Siap Dicetak";
        case "01": return "Armada sampai di Security Pass";
        case "02": return "Armada sampai di Timbang Kosong";
        case "03": return "Armada tiba di Gudang";
        case "04": return "Checkout Gudang Pemuatan";
        case "05": return "Armada berada di Timbang Isi";
        case "06": return "Checkout SPPT";
        case "07": return "Checkout Security Pass";
        case "08": return "Armada selesai dibongkar";
        case "09": return "Armada sampai di Security Pass Lini 3";
        case "10": return "Armada sampai di Gudang Bongkar";
        case "11": return "Armada telah selesai di Gudang Bongkar";
        case "12": return "Checkout Gudang Bongkar";
        case "21": return "Armada telah tiba di Gudang Muat";
        case "22": return "Armada tiba di Scan point di  Pengawasan Pembongkaran";
        default: return "-";
      }
    };

    // ── 3. Build data object ──
    const data = {
      id:             row.id,
      guid:           row.posto_guid,
      bookingno:      row.bookingno,
      tiketno:        row.tiketno,
      posto:          row.posto,
      idshift:        row.idshift,
      shift:          row.shift ?? "-",
      tanggal:        row.tanggal,
      tanggalString:  row.tanggal ? formatDate(row.tanggal) : "-",
      idtransport:    row.idtransport,
      transportString: row.transportString ?? "-",
      idproduk:       row.idproduk,
      produkString:   row.produkString ?? "-",
      asal:           row.asal ?? "-",
      tujuan:         row.tujuan ?? "-",
      nopol:          row.nopol,
      driver:         row.driver,
      qty:            row.qty,
      qtyPOSTO:       row.qtyPOSTO,
      statuspemuatan: row.statuspemuatan,
      position:       row.position,
      positionString: getStatusTiket(row.bookingno, row.position, co, timbangan, hasLogArmada01),
      timesec:        row.timesec,
      timekosong:     row.timekosong,
      timegudang:     row.timegudang,
      timemuat:       row.timemuat,
      timeisi:        row.timeisi,
      updatedby:      row.updatedby,
      updatedon:      row.updatedon,
      updatedonString: row.updatedon ? formatDate(row.updatedon) : "-",
      revised:        row.revised,
      validsecurity:  row.validsecurity,
      validisi:       row.validisi,
      emergencystatus: row.emergencystatus,
      statusticket:   row.statusticket,
      holdreason:     row.holdreason,
      deletereason:   row.deletereason,
      pic:            row.pic,
      gudangtujuan:   co === "PKGEX" ? (row.asal ?? "") : (row.gudangSPPT ?? row.antrianStorageID ?? ""),
      postowilayah:   row.postowilayah ?? "-",
      postobagian:    row.postobagian ?? "-",
      nomorantrian:   row.nomor_antrian?.toString() ?? "",
      labelantrian:   row.label_antrian ?? "",
      company:        co,
      percepatan:     row.percepatan ?? "0",
      jeniskendaraan: row.jeniskendaraan ?? "-",
      tipe:           row.tipe ?? null,
      wilayah:        row.postowilayah ?? "-",
    };

    // ── 4. Query TiketPerubahan ──
    const perubahanRes = await pool
      .request()
      .input("bookingno", sql.VarChar(50), row.bookingno)
      .query(`
        SELECT id, bookingno, before, after, alasan, detail, updatedon, updatedby
        FROM TiketPerubahan
        WHERE bookingno = @bookingno
        ORDER BY updatedon ASC
      `);

    return NextResponse.json({
      data,
      log: logList,
      logChanges: perubahanRes.recordset,
    });
  } catch (error: any) {
    console.error("[track-data]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function formatDate(d: Date | string): string {
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return String(d);
  }
}
