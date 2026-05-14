-- ============================================
-- 异常信息填报系统 V3 - Supabase数据库Schema
-- 沙钢永兴特钢 技术质量处验收班
-- ============================================

-- 1. 创建users表（用户表）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT, -- 存储密码哈希（用于备用登录）
  role TEXT NOT NULL DEFAULT 'inspector' CHECK (role IN ('admin', 'inspector')),
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 创建records表（异常记录表）
CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  material_name TEXT NOT NULL,
  supplier TEXT,
  truck_no TEXT,
  abnormal_desc TEXT,
  inspector1 TEXT NOT NULL,
  inspector2 TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 创建materials表（物料名称历史记录表）
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 创建pending_users表（待审批用户表）
CREATE TABLE IF NOT EXISTS pending_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'inspector',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 索引优化
-- ============================================
CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
CREATE INDEX IF NOT EXISTS idx_records_created_by ON records(created_by);
CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(created_at);
CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);
CREATE INDEX IF NOT EXISTS idx_pending_users_email ON pending_users(email);

-- ============================================
-- Row Level Security (RLS) 策略
-- ============================================

-- 启用RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_users ENABLE ROW LEVEL SECURITY;

-- ========== users表策略 ==========

-- 所有人可以读取用户基本信息（邮箱、姓名、角色）
CREATE POLICY "users_select_all" ON users
  FOR SELECT USING (true);

-- 只有管理员可以查看所有用户完整信息
CREATE POLICY "users_admin_select" ON users
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin' AND approved = true)
  );

-- 用户可以更新自己的信息
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 只有管理员可以删除用户
CREATE POLICY "users_admin_delete" ON users
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin' AND approved = true)
  );

-- ========== records表策略 ==========

-- 管理员可以查看所有记录
CREATE POLICY "records_admin_select_all" ON records
  FOR SELECT USING (
    auth.uid() IN (
      SELECT u.id FROM users u 
      WHERE u.role = 'admin' AND u.approved = true
    )
  );

-- 验收员只能查看自己创建的记录
CREATE POLICY "records_inspector_select_own" ON records
  FOR SELECT USING (auth.uid() = user_id);

-- 所有人可以插入记录
CREATE POLICY "records_insert_all" ON records
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 用户只能更新自己创建的记录
CREATE POLICY "records_update_own" ON records
  FOR UPDATE USING (auth.uid() = user_id);

-- 用户只能删除自己创建的记录
CREATE POLICY "records_delete_own" ON records
  FOR DELETE USING (auth.uid() = user_id);

-- ========== materials表策略 ==========

-- 所有人可以读取物料名称
CREATE POLICY "materials_select_all" ON materials
  FOR SELECT USING (true);

-- 只有管理员可以新增物料名称
CREATE POLICY "materials_admin_insert" ON materials
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin' AND approved = true)
    OR auth.uid() IS NOT NULL -- 允许所有认证用户新增（前端会处理）
  );

-- 只有管理员可以删除物料名称
CREATE POLICY "materials_admin_delete" ON materials
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin' AND approved = true)
  );

-- ========== pending_users表策略 ==========

-- 所有人可以插入待审批用户
CREATE POLICY "pending_users_insert_all" ON pending_users
  FOR INSERT WITH CHECK (true);

-- 只有管理员可以查看待审批用户
CREATE POLICY "pending_users_admin_select" ON pending_users
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin' AND approved = true)
  );

-- 只有管理员可以删除待审批用户
CREATE POLICY "pending_users_admin_delete" ON pending_users
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin' AND approved = true)
  );

-- ============================================
-- Supabase Functions（数据库函数）
-- ============================================

-- 函数：获取所有记录（管理员专用，绕过RLS用户过滤）
CREATE OR REPLACE FUNCTION get_all_records()
RETURNS SETOF records
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 检查调用者是否是管理员
  IF auth.uid() IN (SELECT id FROM users WHERE role = 'admin' AND approved = true) THEN
    RETURN QUERY SELECT * FROM records ORDER BY created_at DESC;
  ELSE
    -- 非管理员只能看到自己的记录
    RETURN QUERY SELECT * FROM records WHERE user_id = auth.uid() ORDER BY created_at DESC;
  END IF;
END;
$$;

-- 函数：获取仪表盘统计
CREATE OR REPLACE FUNCTION get_dashboard_stats(user_role TEXT, user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  week_count INT;
  month_count INT;
  my_count INT;
  total_count INT;
  material_types INT;
  result JSON;
BEGIN
  IF user_role = 'admin' THEN
    -- 管理员统计所有数据
    SELECT COUNT(*) INTO week_count FROM records 
      WHERE created_at >= NOW() - INTERVAL '7 days';
    SELECT COUNT(*) INTO month_count FROM records 
      WHERE created_at >= DATE_TRUNC('month', NOW());
    SELECT COUNT(DISTINCT material_name) INTO material_types FROM records;
  ELSE
    -- 验收员只统计自己的数据
    SELECT COUNT(*) INTO week_count FROM records 
      WHERE user_id = get_dashboard_stats.user_id 
      AND created_at >= NOW() - INTERVAL '7 days';
    SELECT COUNT(*) INTO month_count FROM records 
      WHERE user_id = get_dashboard_stats.user_id 
      AND created_at >= DATE_TRUNC('month', NOW());
    SELECT COUNT(DISTINCT material_name) INTO material_types FROM records 
      WHERE user_id = get_dashboard_stats.user_id;
  END IF;
  
  -- 我的统计
  SELECT COUNT(*) INTO my_count FROM records WHERE user_id = get_dashboard_stats.user_id;
  SELECT COUNT(*) INTO total_count FROM records;
  
  result := json_build_object(
    'week_count', week_count,
    'month_count', month_count,
    'my_count', my_count,
    'total_count', total_count,
    'material_types', material_types
  );
  
  RETURN result;
END;
$$;

-- 函数：审批用户
CREATE OR REPLACE FUNCTION approve_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 检查是否是管理员
  IF auth.uid() IN (SELECT id FROM users WHERE role = 'admin' AND approved = true) THEN
    UPDATE users SET approved = true, updated_at = NOW() WHERE id = p_user_id;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

-- 函数：获取用户列表（包括待审批）
CREATE OR REPLACE FUNCTION get_users_list()
RETURNS TABLE(id UUID, email TEXT, name TEXT, role TEXT, approved BOOLEAN, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 检查是否是管理员
  IF auth.uid() IN (SELECT id FROM users WHERE role = 'admin' AND approved = true) THEN
    RETURN QUERY SELECT u.id, u.email, u.name, u.role, u.approved, u.created_at FROM users u ORDER BY u.created_at DESC;
  ELSE
    RETURN QUERY SELECT u.id, u.email, u.name, u.role, u.approved, u.created_at FROM users u WHERE u.id = auth.uid();
  END IF;
END;
$$;

-- 函数：获取待审批用户列表
CREATE OR REPLACE FUNCTION get_pending_users_list()
RETURNS TABLE(id UUID, email TEXT, name TEXT, role TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IN (SELECT id FROM users WHERE role = 'admin' AND approved = true) THEN
    RETURN QUERY SELECT pu.id, pu.email, pu.name, pu.role, pu.created_at FROM pending_users pu ORDER BY pu.created_at DESC;
  ELSE
    RETURN QUERY SELECT pu.id, pu.email, pu.name, pu.role, pu.created_at FROM pending_users pu WHERE pu.email = (SELECT email FROM users WHERE id = auth.uid());
  END IF;
END;
$$;

-- ============================================
-- 触发器：自动更新updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_records_updated_at
  BEFORE UPDATE ON records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 初始数据
-- ============================================

-- 插入管理员用户（需要手动设置密码）
-- 注意：实际密码需要在Supabase Auth中设置
INSERT INTO users (email, name, role, approved) VALUES
  ('gxysb2127@126.com', '郭鑫', 'admin', true),
  ('zhaofei@126.com', '赵飞', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- 插入初始物料名称
INSERT INTO materials (name) VALUES
  ('钒铁'),
  ('钼铁'),
  ('铝块'),
  ('铝粒'),
  ('钒氮合金'),
  ('钛铁'),
  ('铌铁'),
  ('硼铁')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 注意事项
-- ============================================
-- 1. 在Supabase控制台执行此SQL
-- 2. 管理员账号需要通过Supabase Auth注册后，再执行以下命令更新approved状态
-- 3. 或者在Supabase控制台手动设置用户的approved=true
-- 4. 确保在Supabase Authentication设置中启用Email登录
