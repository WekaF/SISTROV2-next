-- Adds blokir (block/unblock) tracking columns to Armada.
-- Run once against the target SQL Server database, then refresh
-- SistroEntities.edmx in Visual Studio (see armada_blokir_columns_guide.md).

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Armada') AND name = 'is_blocked'
)
BEGIN
    ALTER TABLE dbo.Armada ADD is_blocked BIT NOT NULL CONSTRAINT DF_Armada_is_blocked DEFAULT (0);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Armada') AND name = 'blocked_on'
)
BEGIN
    ALTER TABLE dbo.Armada ADD blocked_on DATETIME NULL;
END

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Armada') AND name = 'blocked_by'
)
BEGIN
    ALTER TABLE dbo.Armada ADD blocked_by NVARCHAR(100) NULL;
END

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Armada') AND name = 'blocked_reason'
)
BEGIN
    ALTER TABLE dbo.Armada ADD blocked_reason NVARCHAR(500) NULL;
END
