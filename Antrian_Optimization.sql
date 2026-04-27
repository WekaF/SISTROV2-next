-- ==================================================================================
-- Optimized Antrian Table and Triggers
-- Designed for Large Datasets and High Performance
-- ==================================================================================

-- 1. Create Infrastructure Tables if missing
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MappingProdukGudang]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[MappingProdukGudang] (
        [gudang] varchar(50) NOT NULL,
        [produk] varchar(50) NOT NULL,
        [antrian] int DEFAULT 0 NULL,
        CONSTRAINT [PK_MappingProdukGudang] PRIMARY KEY ([gudang], [produk])
    ) ON [PRIMARY];
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LogTriggerPindahGudang]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[LogTriggerPindahGudang] (
        [id] int IDENTITY(1,1) NOT NULL,
        [ticketID] varchar(50) NULL,
        [ProdukID] varchar(50) NULL,
        [StorageID] varchar(50) NULL,
        [StorageIDnew] varchar(50) NULL,
        [antriangudang_old] int NULL,
        [antriangudang_new] int NULL,
        [antrianproduk_old] int NULL,
        [antrianproduk_new] int NULL,
        [updatedby] datetime DEFAULT getdate() NULL,
        CONSTRAINT [PK_LogTriggerPindahGudang] PRIMARY KEY ([id])
    ) ON [PRIMARY];
END
GO

-- 2. Create Antrian Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Antrian]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Antrian] (
        [id] int IDENTITY(1,1) NOT NULL,
        [ticketID] varchar(50) NOT NULL,
        [storageID] varchar(50) NULL,
        [updatedon] datetime DEFAULT getdate() NULL,
        [timekosong] datetime NULL,
        [status] varchar(50) NULL,
        [skipcount] int DEFAULT 0 NULL,
        [lastskiptime] datetime NULL,
        [revised] varchar(255) NULL,
        [pic] varchar(255) NULL,
        CONSTRAINT [PK_Antrian] PRIMARY KEY CLUSTERED ([ticketID])
    ) ON [PRIMARY];
END
GO

-- 2. Optimized Indexes
-- Index for general ID lookup
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Antrian_ID' AND object_id = OBJECT_ID('[dbo].[Antrian]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Antrian_ID] ON [dbo].[Antrian] ([id] ASC);
END
GO

-- Filtered Index for Active Queue (Status IS NULL)
-- This is the most important index for Performance as it keeps the index small
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Antrian_ActiveQueue' AND object_id = OBJECT_ID('[dbo].[Antrian]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Antrian_ActiveQueue] 
    ON [dbo].[Antrian] ([status], [storageID], [updatedon])
    WHERE [status] IS NULL;
END
GO

-- Index for Status searching (completed items)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Antrian_Status_Update' AND object_id = OBJECT_ID('[dbo].[Antrian]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Antrian_Status_Update] ON [dbo].[Antrian] ([status] ASC, [updatedon] ASC);
END
GO

-- 3. Set-Based Triggers for Scalability

-- INSERT TRIGGER
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_antrian_insert') DROP TRIGGER [dbo].[trg_antrian_insert];
GO

CREATE TRIGGER [dbo].[trg_antrian_insert]
ON [dbo].[Antrian]
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    -- Update counts for affected Warehouses
    UPDATE g
    SET antrian = (SELECT COUNT(*) FROM Antrian a WHERE a.storageID = g.ID AND a.[status] IS NULL)
    FROM Gudang_SPPT g
    WHERE g.ID IN (SELECT DISTINCT storageID FROM inserted WHERE storageID IS NOT NULL);

    -- Update counts for affected Product-Warehouse Mappings
    UPDATE m
    SET antrian = (
        SELECT COUNT(*) 
        FROM Antrian a 
        INNER JOIN Tiket t ON a.ticketID = t.bookingno 
        WHERE a.storageID = m.gudang AND t.idproduk = m.produk AND a.[status] IS NULL
    )
    FROM MappingProdukGudang m
    WHERE EXISTS (
        SELECT 1 
        FROM inserted i 
        INNER JOIN Tiket t ON i.ticketID = t.bookingno
        WHERE i.storageID = m.gudang AND t.idproduk = m.produk
    );
END
GO

-- UPDATE TRIGGER (Handles storage changes and status updates)
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_antrian_update') DROP TRIGGER [dbo].[trg_antrian_update];
GO

CREATE TRIGGER [dbo].[trg_antrian_update]
ON [dbo].[Antrian]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Collect all affected Warehouses (Old and New)
    DECLARE @AffectedStorages TABLE (ID varchar(50));
    INSERT INTO @AffectedStorages
    SELECT DISTINCT storageID FROM inserted WHERE storageID IS NOT NULL
    UNION
    SELECT DISTINCT storageID FROM deleted WHERE storageID IS NOT NULL;

    -- Update counts for affected Warehouses
    UPDATE g
    SET antrian = (SELECT COUNT(*) FROM Antrian a WHERE a.storageID = g.ID AND a.[status] IS NULL)
    FROM Gudang_SPPT g
    WHERE g.ID IN (SELECT ID FROM @AffectedStorages);

    -- Update counts for affected Product-Warehouse Mappings
    UPDATE m
    SET antrian = (
        SELECT COUNT(*) 
        FROM Antrian a 
        INNER JOIN Tiket t ON a.ticketID = t.bookingno 
        WHERE a.storageID = m.gudang AND t.idproduk = m.produk AND a.[status] IS NULL
    )
    FROM MappingProdukGudang m
    WHERE EXISTS (
        SELECT 1 
        FROM (SELECT ticketID, storageID FROM inserted UNION SELECT ticketID, storageID FROM deleted) i
        INNER JOIN Tiket t ON i.ticketID = t.bookingno
        WHERE i.storageID = m.gudang AND t.idproduk = m.produk
    );

    -- Logging Storage Transfers (Set-Based)
    IF UPDATE(storageID)
    BEGIN
        INSERT INTO [dbo].[LogTriggerPindahGudang]
               ([ticketID], [ProdukID], [StorageID], [StorageIDnew], 
                [antriangudang_old], [antriangudang_new], 
                [antrianproduk_old], [antrianproduk_new], [updatedby])
        SELECT 
            i.ticketID,
            t.idproduk,
            d.storageID,
            i.storageID,
            (SELECT COUNT(*) FROM Antrian a WHERE a.storageID = d.storageID AND a.[status] IS NULL),
            (SELECT COUNT(*) FROM Antrian a WHERE a.storageID = i.storageID AND a.[status] IS NULL),
            (SELECT COUNT(*) FROM Antrian a INNER JOIN Tiket tx ON a.ticketID = tx.bookingno WHERE a.storageID = d.storageID AND tx.idproduk = t.idproduk AND a.[status] IS NULL),
            (SELECT COUNT(*) FROM Antrian a INNER JOIN Tiket tx ON a.ticketID = tx.bookingno WHERE a.storageID = i.storageID AND tx.idproduk = t.idproduk AND a.[status] IS NULL),
            GETDATE()
        FROM inserted i
        INNER JOIN deleted d ON i.ticketID = d.ticketID
        INNER JOIN Tiket t ON i.ticketID = t.bookingno
        WHERE i.storageID <> d.storageID;
    END
END
GO

-- DELETE TRIGGER (Proper data integrity)
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_antrian_delete') DROP TRIGGER [dbo].[trg_antrian_delete];
GO

CREATE TRIGGER [dbo].[trg_antrian_delete]
ON [dbo].[Antrian]
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- Update counts for affected Warehouses
    UPDATE g
    SET antrian = (SELECT COUNT(*) FROM Antrian a WHERE a.storageID = g.ID AND a.[status] IS NULL)
    FROM Gudang_SPPT g
    WHERE g.ID IN (SELECT DISTINCT storageID FROM deleted WHERE storageID IS NOT NULL);

    -- Update counts for affected Product-Warehouse Mappings
    UPDATE m
    SET antrian = (
        SELECT COUNT(*) 
        FROM Antrian a 
        INNER JOIN Tiket t ON a.ticketID = t.bookingno 
        WHERE a.storageID = m.gudang AND t.idproduk = m.produk AND a.[status] IS NULL
    )
    FROM MappingProdukGudang m
    WHERE EXISTS (
        SELECT 1 
        FROM deleted d
        INNER JOIN Tiket t ON d.ticketID = t.bookingno
        WHERE d.storageID = m.gudang AND t.idproduk = m.produk
    );
END
GO
