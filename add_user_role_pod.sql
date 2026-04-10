-- Assignment for specific User GUID
DECLARE @TargetUserId UNIQUEIDENTIFIER = '22A35E15-3138-4CB0-9D2C-F7235BC6BCD9';
DECLARE @TargetRoleId INT = 3; -- POD Role

-- 1. Ensure User Exists
IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE [Id] = @TargetUserId)
BEGIN
    INSERT INTO [dbo].[Users] ([Id], [UserName], [FullName], [Email], [IsActive])
    VALUES (@TargetUserId, 'pod_legacy', 'Legacy POD User', 'pod_legacy@sistro.com', 1);
    PRINT 'Inserted placeholder for legacy user.';
END

-- 2. Add Role (3 = POD)
IF NOT EXISTS (SELECT 1 FROM [dbo].[UserRoles] WHERE [UserId] = @TargetUserId AND [RoleId] = @TargetRoleId)
BEGIN
    INSERT INTO [dbo].[UserRoles] ([UserId], [RoleId])
    VALUES (@TargetUserId, @TargetRoleId);
    PRINT 'Assigned Role ID 3 to user.';
END
ELSE
BEGIN
    PRINT 'Role already assigned.';
END

-- 3. Ensure Company Access (Optional but necessary for functional POD)
IF NOT EXISTS (SELECT 1 FROM [dbo].[UserCompanies] WHERE [UserId] = @TargetUserId AND [CompanyCode] = 'PLNT_A')
BEGIN
    INSERT INTO [dbo].[UserCompanies] ([UserId], [CompanyCode], [IsPrimary])
    VALUES (@TargetUserId, 'PLNT_A', 1);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[UserCompanies] WHERE [UserId] = @TargetUserId AND [CompanyCode] = 'PLNT_B')
BEGIN
    INSERT INTO [dbo].[UserCompanies] ([UserId], [CompanyCode], [IsPrimary])
    VALUES (@TargetUserId, 'PLNT_B', 0);
END

PRINT 'User setup completed for login and upload.';
