berikut adalah table posto pada apps sistro yang lama
CREATE TABLE [dbo].[Posto] (
  [id] bigint  IDENTITY(1,1) NOT NULL,
  [guid] varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [noposto] varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [deleted] varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS DEFAULT '0' NULL,
  [tglposto] datetime  NULL,
  [asal] varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [tujuan] varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [transport] varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [produk] varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [qty] numeric(18,3)  NULL,
  [status] varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [updatedon] datetime  NULL,
  [updatedby] nvarchar(128) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [uploadcode] varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [tglakhir] datetime  NULL,
  [qtyrencana] numeric(18,3)  NULL,
  [qtyrealisasi] numeric(18,3)  NULL,
  [pallet] varchar(1) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [cutoff] varchar(1) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [wilayah] varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [bagian] varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [selisihcutoff] numeric(18,3)  NULL,
  [kapal] varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [company_code] varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [tipe] varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [kotatujuan] varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [initialqty] numeric(18,3) DEFAULT 0 NULL,
  [tgljatuhtempo] datetime  NULL,
  [charter] varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [distributor] varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [Percepatan] varchar(10) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [IdGrupTruk] int  NULL,
  [MuatanPercepatan] decimal(18,3)  NULL,
  CONSTRAINT [PK_Posto_1] PRIMARY KEY CLUSTERED ([noposto])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY],
  CONSTRAINT [FK_POSTOLini_Produk] FOREIGN KEY ([produk]) REFERENCES [dbo].[Produk] ([ID]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [FK_Posto_AspNetUsers] FOREIGN KEY ([updatedby]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [FK_POSTO_M_Wilayah] FOREIGN KEY ([wilayah]) REFERENCES [dbo].[M_Wilayah] ([abbrev]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [FK_POSTO_Transport] FOREIGN KEY ([transport]) REFERENCES [dbo].[Transport] ([kode]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [FK_POSTOLini_Transport] FOREIGN KEY ([transport]) REFERENCES [dbo].[Transport] ([kode]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [FK_POSTO_Produk] FOREIGN KEY ([produk]) REFERENCES [dbo].[Produk] ([ID]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [FK_Posto_M_Bagian] FOREIGN KEY ([bagian]) REFERENCES [dbo].[M_Bagian] ([abbrev]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [FK_POSTO_Gudang_Asal] FOREIGN KEY ([asal]) REFERENCES [dbo].[Gudang] ([ID]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [FK_POSTO_Gudang_Tujuan] FOREIGN KEY ([tujuan]) REFERENCES [dbo].[Gudang] ([ID]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [FK_PostoLini_AspNetUsers] FOREIGN KEY ([updatedby]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [FK_PostoLini_Company] FOREIGN KEY ([company_code]) REFERENCES [dbo].[Company] ([company_code]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [FK_POSTOLini_Gudang_Asal] FOREIGN KEY ([asal]) REFERENCES [dbo].[Gudang] ([ID]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [FK_POSTOLini_Gudang_Tujuan] FOREIGN KEY ([tujuan]) REFERENCES [dbo].[Gudang] ([ID]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [FK_PostoLini_M_Bagian] FOREIGN KEY ([bagian]) REFERENCES [dbo].[M_Bagian] ([abbrev]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [FK_POSTOLini_M_Wilayah] FOREIGN KEY ([wilayah]) REFERENCES [dbo].[M_Wilayah] ([abbrev]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [FK_Posto_Company] FOREIGN KEY ([company_code]) REFERENCES [dbo].[Company] ([company_code]) ON DELETE NO ACTION ON UPDATE NO ACTION
)  
ON [PRIMARY]
GO

ALTER TABLE [dbo].[Posto] SET (LOCK_ESCALATION = TABLE)
GO

CREATE NONCLUSTERED INDEX [Posto_company_code]
ON [dbo].[Posto] (
  [company_code] ASC
)
GO

CREATE NONCLUSTERED INDEX [IDX_Posto_Noposto_CompanyCode]
ON [dbo].[Posto] (
  [noposto] ASC,
  [company_code] ASC
)
GO

CREATE TRIGGER [dbo].[TR_INS_posto]
ON [dbo].[Posto]
WITH EXECUTE AS CALLER
FOR INSERT
AS
UPDATE
    Alokasi_PerGP
SET
    Alokasi_PerGP.sum_posto = isnull(b.qty,0)
FROM
    Alokasi_PerGP 
    left JOIN (	select year(tglposto)tahun,tujuan,sum(qty) qty
	from posto
	group by year(tglposto),tujuan) b 
        ON Alokasi_PerGP.plant = b.tujuan and Alokasi_PerGP.periode=b.tahun
GO

CREATE TRIGGER [dbo].[tr_update_posto]
ON [dbo].[Posto]
WITH EXECUTE AS CALLER
FOR UPDATE
AS
BEGIN
    SET NOCOUNT ON;
      UPDATE
    Alokasi_PerGP
SET
    Alokasi_PerGP.sum_posto = isnull(b.qty,0)
FROM
    Alokasi_PerGP 
    left JOIN (	select year(tglposto)tahun,tujuan,sum(qty) qty
	from posto
	group by year(tglposto),tujuan) b 
        ON Alokasi_PerGP.plant = b.tujuan and Alokasi_PerGP.periode=b.tahun
		end
GO

DISABLE TRIGGER [dbo].[TR_INS_posto] ON [dbo].[Posto]
GO

DISABLE TRIGGER [dbo].[tr_update_posto] ON [dbo].[Posto]


hilangkan palet, deleted, kotatujuan, distributor

pelajari strukturnya dan terapkan di sistro-next yang Baru
dan beri contoh data dummy seperti berikut
261239	bf9b2ad9-6516-4699-8880-b218285868bb	5120373867		2026-09-04 00:00:00.000	B228	B4AU	1000006255	1000076	7,700	1	2026-04-09 18:22:22.587	0F358239-BA27-47A2-993E-4E185874B440	7c0695ed-1578-44f7-96bb-f5f2a8cbd8da		0,000	0,000	0	0	DW1_GP	POALL	0,000		E234	POALL		0,000		0		0	0	
261240	16c821f4-5671-4cb7-b7ef-cb0a67a1f3a8	5120373868		2026-09-04 00:00:00.000	B228	B3H5	4000000770	1000076	91,200	1	2026-04-09 18:22:23.157	0F358239-BA27-47A2-993E-4E185874B440	7c0695ed-1578-44f7-96bb-f5f2a8cbd8da		0,000	0,000	0	0	DW1_GP	POALL	0,000		E234	POALL		0,000		0		0	0	
261241	1cdf9842-afaf-47a5-a80c-7e4f84db8cdf	5120373869		2026-09-04 00:00:00.000	B228	B4BD	1000006252	1000076	61,600	1	2026-04-09 18:22:23.553	0F358239-BA27-47A2-993E-4E185874B440	7c0695ed-1578-44f7-96bb-f5f2a8cbd8da		0,000	0,000	0	0	DW1_GP	POALL	0,000		E234	POALL		0,000		0		0	0	
261242	f3f8e01e-591d-44be-b526-38d40712d0b0	5120373870		2026-09-04 00:00:00.000	B228	B4BD	1000006255	1000076	61,600	1	2026-04-09 18:22:24.063	0F358239-BA27-47A2-993E-4E185874B440	7c0695ed-1578-44f7-96bb-f5f2a8cbd8da		0,000	0,000	0	0	DW1_GP	POALL	0,000		E234	POALL		0,000		0		0	0	
261243	f18bf1c0-56dd-4f31-b51f-294bbd469da6	5120373871		2026-09-04 00:00:00.000	B228	B4AL	4000000116	1000076	3,000	1	2026-04-09 18:22:24.657	0F358239-BA27-47A2-993E-4E185874B440	7c0695ed-1578-44f7-96bb-f5f2a8cbd8da		0,000	0,000	0	0	DW1_GP	POALL	0,000		E234	POALL		0,000		0		0	0	