# 异常信息填报系统

> 沙钢永兴特钢技术质量处验收班专用

## 功能特点

- 📱 **移动端优先** - 专为手机设计，可添加到桌面
- 🎨 **高颜值界面** - 渐变色卡片、流畅动画、微交互
- 📊 **数据仪表盘** - 趋势图、饼图、实时统计
- 👥 **多角色支持** - 管理员、统计员、验收员
- 📤 **Excel导出** - 一键导出数据报表
- 🔄 **PWA支持** - 离线缓存、添加到主屏幕

## 快速开始

### 本地运行

```bash
# 安装依赖
pip install -r requirements.txt

# 启动服务
python app.py

# 访问 http://localhost:5000
```

### 部署到云端

详见 [部署指南.md](部署指南.md)

## 用户角色

| 用户 | 角色 | 权限 |
|------|------|------|
| 郭鑫 | 管理员 | 全部功能 |
| 赵飞 | 统计员 | 查看全部、导出Excel |
| 郭娟娟 | 验收员 | 填报、查看自己记录 |
| 姬银平 | 验收员 | 填报、查看自己记录 |
| 王三妮 | 验收员 | 填报、查看自己记录 |

## 技术栈

- **后端**: Python Flask
- **数据库**: PostgreSQL / SQLite
- **前端**: 原生JavaScript SPA
- **图表**: Chart.js 4.x
- **部署**: Render.com

## 项目结构

```
├── app.py              # Flask主程序
├── requirements.txt    # Python依赖
├── templates/
│   └── index.html      # SPA单页应用
├── static/
│   ├── css/style.css   # 样式文件
│   └── js/app.js       # 主逻辑
├── manifest.json       # PWA配置
├── sw.js              # Service Worker
└── 部署指南.md         # 部署教程
```

## License

MIT
