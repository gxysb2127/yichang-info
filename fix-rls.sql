-- ============================================
-- 修复RLS无限递归问题
-- ============================================

-- 1. 删除冲突的users表策略
DROP POLICY IF EXISTS "users_select_all" ON users;
DROP POLICY IF EXISTS "users_admin_select" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_admin_delete" ON users;

-- 2. 重新创建users表策略（使用SECURITY DEFINER函数避免递归）
-- 所有认证用户可读取基本信息
CREATE POLICY "users_select_authenticated" ON users
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 用户可以更新自己的信息
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 只有管理员可以删除用户（通过函数判断，避免递归）
CREATE POLICY "users_admin_delete" ON users
  FOR DELETE USING (is_admin());

-- 3. 删除冲突的records表策略
DROP POLICY IF EXISTS "records_admin_select_all" ON records;
DROP POLICY IF EXISTS "records_inspector_select_own" ON records;
DROP POLICY IF EXISTS "records_insert_all" ON records;
DROP POLICY IF EXISTS "records_update_own" ON records;
DROP POLICY IF EXISTS "records_delete_own" ON records;

-- 4. 重新创建records表策略
CREATE POLICY "records_select_own" ON records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "records_insert_all" ON records
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "records_update_own" ON records
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "records_delete_own" ON records
  FOR DELETE USING (user_id = auth.uid());

-- 5. 删除冲突的materials表策略
DROP POLICY IF EXISTS "materials_admin_insert" ON materials;
DROP POLICY IF EXISTS "materials_admin_delete" ON materials;

-- 6. 重新创建materials表策略
CREATE POLICY "materials_insert_authenticated" ON materials
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "materials_admin_delete" ON materials
  FOR DELETE USING (is_admin());

-- 7. 删除冲突的pending_users表策略
DROP POLICY IF EXISTS "pending_users_admin_select" ON pending_users;
DROP POLICY IF EXISTS "pending_users_admin_delete" ON pending_users;

-- 8. 重新创建pending_users表策略
CREATE POLICY "pending_users_select_authenticated" ON pending_users
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "pending_users_admin_delete" ON pending_users
  FOR DELETE USING (is_admin());

-- 9. 创建is_admin辅助函数（避免RLS递归）
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = auth.uid() AND approved = true LIMIT 1;
  RETURN user_role = 'admin';
END;
$$;

-- 10. 更新get_all_records函数，使用is_admin()
CREATE OR REPLACE FUNCTION get_all_records()
RETURNS SETOF records
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF is_admin() THEN
    RETURN QUERY SELECT * FROM records ORDER BY created_at DESC;
  ELSE
    RETURN QUERY SELECT * FROM records WHERE user_id = auth.uid() ORDER BY created_at DESC;
  END IF;
END;
$$;

-- 11. 更新其他函数
CREATE OR REPLACE FUNCTION approve_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF is_admin() THEN
    UPDATE users SET approved = true, updated_at = NOW() WHERE id = p_user_id;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION get_users_list()
RETURNS TABLE(id UUID, email TEXT, name TEXT, role TEXT, approved BOOLEAN, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF is_admin() THEN
    RETURN QUERY SELECT u.id, u.email, u.name, u.role, u.approved, u.created_at FROM users u ORDER BY u.created_at DESC;
  ELSE
    RETURN QUERY SELECT u.id, u.email, u.name, u.role, u.approved, u.created_at FROM users u WHERE u.id = auth.uid();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_pending_users_list()
RETURNS TABLE(id UUID, email TEXT, name TEXT, role TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF is_admin() THEN
    RETURN QUERY SELECT pu.id, pu.email, pu.name, pu.role, pu.created_at FROM pending_users pu ORDER BY pu.created_at DESC;
  ELSE
    RETURN QUERY SELECT pu.id, pu.email, pu.name, pu.role, pu.created_at FROM pending_users pu WHERE pu.email = (SELECT email FROM users WHERE id = auth.uid());
  END IF;
END;
$$;
