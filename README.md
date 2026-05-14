# 异常信息填报系统 V3 - 云端版

## 简介

异常信息填报系统 V3 是基于 Supabase 云数据库的多用户协同版本，支持多设备数据同步、用户权限管理和数据导出功能。

## 主要功能

### ✅ 已实现
- **多用户云端数据共享**：所有数据存储在 Supabase 云端数据库
- **用户认证**：邮箱+密码登录/注册
- **角色权限**：
  - 管理员（郭鑫、赵飞）：查看全部数据、导出 Excel、审批新用户
  - 验收员：只能查看和修改自己填报的数据
- **用户审批流程**：新用户注册后需管理员审批才能使用
- **物料自动补全**：支持历史物料名称自动补全 + 新增物料
- **Excel 导出**：按周/月/自定义范围导出
- **实时仪表盘**：统计卡片和图表展示
- **响应式设计**：完美支持移动端

## 部署指南

### 1. 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 注册并登录
2. 点击 "New Project" 创建新项目
3. 等待项目创建完成（约2分钟）

### 2. 获取项目配置

1. 进入项目 Dashboard
2. 点击左侧 **Settings** → **API**
3. 复制以下信息：
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

### 3. 配置数据库

1. 进入项目 Dashboard
2. 点击左侧 **SQL Editor**
3. 复制 `supabase-schema.sql` 文件中的全部内容
4. 粘贴到 SQL Editor 并点击 **Run**

### 4. 配置前端

1. 打开 `index.html` 文件
2. 找到文件顶部的配置区域（约第780行）：
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';  // 替换为你的 Project URL
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';  // 替换为你的 anon key
```

### 5. 部署前端

#### 方案一：直接打开 HTML 文件（仅限本地测试）
```bash
# 使用 Python 启动本地服务器
python -m http.server 8080
# 或使用 Node.js
npx serve .
```

#### 方案二：部署到静态托管（推荐）

**Vercel:**
```bash
npm i -g vercel
vercel --prod
```

**Netlify:**
```bash
npm i -g netlify-cli
netlify deploy --prod
```

**GitHub Pages:**
1. 将文件推送到 GitHub 仓库
2. 进入仓库 Settings → Pages
3. 选择 branch: main

## 管理员配置

### 添加初始管理员

数据库 Schema 执行后，需要手动设置管理员：

1. 进入 Supabase Dashboard → **Authentication** → **Users**
2. 使用管理员邮箱登录系统（会失败，但会创建用户记录）
3. 在 SQL Editor 中执行：
```sql
UPDATE users SET approved = true, role = 'admin' WHERE email = 'gxysb2127@126.com';
```

### 审批新用户

1. 管理员登录系统
2. 进入 "我的" → "用户管理"
3. 可以看到待审批用户列表
4. 点击"批准"允许用户使用系统

## 数据库表结构

### users 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键，用户ID |
| email | TEXT | 邮箱（唯一） |
| name | TEXT | 姓名 |
| role | TEXT | 角色：admin/inspector |
| approved | BOOLEAN | 是否已审批 |
| created_at | TIMESTAMPTZ | 创建时间 |

### records 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键，记录ID |
| user_id | UUID | 填报用户ID |
| date | TEXT | 日期 |
| material_name | TEXT | 物料名称 |
| supplier | TEXT | 供货单位 |
| truck_no | TEXT | 车号 |
| abnormal_desc | TEXT | 异常描述 |
| inspector1 | TEXT | 验收员1 |
| inspector2 | TEXT | 验收员2 |
| created_by | TEXT | 填报人姓名 |
| created_at | TIMESTAMPTZ | 创建时间 |

### materials 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | TEXT | 物料名称（唯一） |
| created_at | TIMESTAMPTZ | 创建时间 |

## 安全说明

- 使用 Supabase Row Level Security (RLS) 实现数据权限控制
- 验收员只能看到和修改自己的记录
- 管理员可以看到所有记录
- 敏感操作需要管理员权限

## 技术栈

- **前端**：原生 HTML/CSS/JavaScript
- **后端**：Supabase (PostgreSQL + Auth + REST API)
- **图表**：Chart.js
- **Excel 导出**：SheetJS (xlsx)
- **CDN**：jsDelivr

## 版本历史

### V3.0 (2024)
- ✅ 升级为 Supabase 云端数据库
- ✅ 添加用户注册/登录功能
- ✅ 实现管理员审批流程
- ✅ 添加用户管理功能
- ✅ 物料名称自动补全
- ✅ 管理员可导出所有数据

### V2.0
- 纯前端 LocalStorage 版本
- 用户选择式登录

### V1.0
- 初始版本

## 常见问题

### Q: 忘记密码怎么办？
A: 联系管理员在 Supabase Authentication 中重置密码。

### Q: 管理员账号有哪些？
A: 初始管理员：郭鑫 (gxysb2127@126.com)、赵飞。实际账号需要通过 Supabase Auth 注册后由管理员审批。

### Q: 如何导出历史数据？
A: 管理员登录后进入"我的"→"导出Excel"，可按周/月/自定义范围导出。

### Q: 可以离线使用吗？
A: 查看数据需要网络连接。提交功能在离线时会提示失败（未来版本会支持离线队列）。

## 联系方式

技术支持：请联系系统管理员
