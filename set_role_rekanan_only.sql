-- Set Rekanan as the only role for the user to verify the menu
DECLARE @TargetUserId UNIQUEIDENTIFIER = '22A35E15-3138-4CB0-9D2C-F7235BC6BCD9';

-- 1. Remove all existing roles for this user
DELETE FROM [dbo].[UserRoles] WHERE [UserId] = @TargetUserId;

-- 2. Assign ONLY the Rekanan role
-- Get the ID for 'rekanan'
DECLARE @RoleId INT;
SELECT @RoleId = [Id] FROM [dbo].[Roles] WHERE [Code] = 'rekanan';

IF @RoleId IS NOT NULL
BEGIN
    INSERT INTO [dbo].[UserRoles] ([UserId], [RoleId]) VALUES (@TargetUserId, @RoleId);
    PRINT 'User role reset to REKANAN only.';
END
ELSE
BEGIN
    PRINT 'ERROR: Role Code ''rekanan'' not found.';
END
