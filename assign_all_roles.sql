-- Assignment for specific User GUID (All available roles)
DECLARE @TargetUserId UNIQUEIDENTIFIER = '22A35E15-3138-4CB0-9D2C-F7235BC6BCD9';

-- 1. Ensure User Exists
IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE [Id] = @TargetUserId)
BEGIN
    INSERT INTO [dbo].[Users] ([Id], [UserName], [FullName], [Email], [IsActive])
    VALUES (@TargetUserId, 'super_user', 'System Tester', 'tester@sistro.com', 1);
    PRINT 'Inserted placeholder for user.';
END

-- 2. Assign All Defined Roles
-- This will assign all roles currently in the Roles table to this user.
INSERT INTO [dbo].[UserRoles] ([UserId], [RoleId])
SELECT @TargetUserId, [Id]
FROM [dbo].[Roles] r
WHERE NOT EXISTS (
    SELECT 1 FROM [dbo].[UserRoles] ur 
    WHERE ur.[UserId] = @TargetUserId AND ur.[RoleId] = r.[Id]
);

PRINT 'All roles assigned to user.';

-- 3. Ensure Company Access for all test plants
IF NOT EXISTS (SELECT 1 FROM [dbo].[UserCompanies] WHERE [UserId] = @TargetUserId AND [CompanyCode] = 'PLNT_A')
    INSERT INTO [dbo].[UserCompanies] ([UserId], [CompanyCode], [IsPrimary]) VALUES (@TargetUserId, 'PLNT_A', 1);

IF NOT EXISTS (SELECT 1 FROM [dbo].[UserCompanies] WHERE [UserId] = @TargetUserId AND [CompanyCode] = 'PLNT_B')
    INSERT INTO [dbo].[UserCompanies] ([UserId], [CompanyCode], [IsPrimary]) VALUES (@TargetUserId, 'PLNT_B', 0);

IF NOT EXISTS (SELECT 1 FROM [dbo].[UserCompanies] WHERE [UserId] = @TargetUserId AND [CompanyCode] = 'E234')
    INSERT INTO [dbo].[UserCompanies] ([UserId], [CompanyCode], [IsPrimary]) VALUES (@TargetUserId, 'E234', 0);

PRINT 'User setup completed with All Roles and Multi-Company access.';
