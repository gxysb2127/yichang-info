/**
 * 异常信息填报系统 - 主应用逻辑
 * 沙钢永兴特钢 技术质量处验收班
 */

// ========== 全局变量 ==========
let currentUser = null;
let users = [];
let materials = [];
let records = [];
let currentFilter = 'all';
let deleteTargetId = null;
let trendChart = null;
let materialChart = null;

// ========== 角色名称映射 ==========
const roleNames = {
  'admin': '管理员',
  'statistician': '统计员',
  'inspector': '验收员'
};

// ========== 物料颜色映射 ==========
const materialColors = {
  '钒铁': '#e91e63',
  '钼铁': '#9c27b0',
  '铝块': '#2196f3',
  '铝粒': '#00bcd4',
  '钒氮合金': '#ff9800',
  '钛铁': '#4caf50',
  '铌铁': '#795548',
  '硼铁': '#607d8b'
};

// ========== API 请求 ==========
async function api(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (response.status === 401) {
      // 未登录，跳转到登录页
      logout();
      return null;
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    showToast(error.message, 'error');
    return null;
  }
}

// ========== Toast 提示 ==========
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// ========== 成功动画 ==========
function showSuccessAnimation() {
  const anim = document.getElementById('successAnimation');
  anim.classList.add('show');
  
  setTimeout(() => {
    anim.classList.remove('show');
  }, 1500);
}

// ========== 初始化 ==========
async function init() {
  // 检查登录状态
  const meRes = await api('/api/me');
  
  if (meRes && meRes.user) {
    // 已登录
    currentUser = meRes.user;
    showApp();
    await loadData();
  } else {
    // 未登录，显示登录页
    showLoginPage();
    await loadUsers();
  }
}

// ========== 加载用户列表 ==========
async function loadUsers() {
  const res = await api('/api/users');
  if (res) {
    users = res.users;
    renderUserGrid();
  }
}

// ========== 加载物料列表 ==========
async function loadMaterials() {
  const res = await api('/api/materials');
  if (res) {
    materials = res.materials;
    renderMaterialTags();
  }
}

// ========== 加载数据 ==========
async function loadData() {
  await Promise.all([
    loadMaterials(),
    loadUsers(),
    loadRecords(),
    loadDashboardStats(),
    loadMyStats()
  ]);
  
  renderInspectorGrids();
}

// ========== 加载记录 ==========
async function loadRecords() {
  const res = await api('/api/records');
  if (res) {
    records = res.records || [];
    renderRecords();
  }
}

// ========== 加载仪表盘统计 ==========
async function loadDashboardStats() {
  const res = await api('/api/stats/dashboard');
  if (res) {
    updateDashboardStats(res);
    renderCharts(res);
  }
}

// ========== 加载我的统计 ==========
async function loadMyStats() {
  const res = await api('/api/stats/me');
  if (res) {
    document.getElementById('myMonthCount').textContent = res.month_count;
    document.getElementById('myTotalCount').textContent = res.total_count;
  }
}

// ========== 显示登录页 ==========
function showLoginPage() {
  document.getElementById('loginPage').classList.add('active');
  document.getElementById('appContainer').classList.add('hidden');
}

// ========== 显示应用 ==========
function showApp() {
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('appContainer').classList.remove('hidden');
  
  // 更新用户信息
  document.getElementById('homeUserName').textContent = currentUser.name;
  document.getElementById('profileAvatar').textContent = currentUser.avatar || '👤';
  document.getElementById('profileName').textContent = currentUser.name;
  document.getElementById('profileRole').textContent = roleNames[currentUser.role] || currentUser.role;
  
  // 显示日期
  const now = new Date();
  document.getElementById('homeDate').textContent = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${getWeekday(now)}`;
  
  // 根据角色显示/隐藏菜单
  const isAdmin = currentUser.role === 'admin';
  const canExport = currentUser.role === 'admin' || currentUser.role === 'statistician';
  
  document.getElementById('menuExport').style.display = canExport ? 'flex' : 'none';
  document.getElementById('menuAdmin').style.display = isAdmin ? 'flex' : 'none';
  
  // 默认显示首页
  switchTab('home');
}

// ========== 获取星期几 ==========
function getWeekday(date) {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return weekdays[date.getDay()];
}

// ========== 渲染用户网格 ==========
function renderUserGrid() {
  const grid = document.getElementById('userGrid');
  grid.innerHTML = users.map(user => `
    <div class="user-item" data-name="${user.name}" onclick="selectUser(this)">
      <div class="user-avatar">${user.avatar || '👤'}</div>
      <div class="user-name">${user.name}</div>
      <div class="user-role">${roleNames[user.role] || user.role}</div>
    </div>
  `).join('');
}

// ========== 选择用户 ==========
function selectUser(el) {
  // 移除之前的选中状态
  document.querySelectorAll('.user-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  // 添加选中状态
  el.classList.add('selected');
  
  // 启用登录按钮
  document.getElementById('loginBtn').disabled = false;
  
  // 记录选中的用户名
  window.selectedUserName = el.dataset.name;
}

// ========== 登录 ==========
async function doLogin() {
  const name = window.selectedUserName;
  if (!name) {
    showToast('请先选择账号', 'warning');
    return;
  }
  
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = '登录中...';
  
  const res = await api('/api/login', {
    method: 'POST',
    body: JSON.stringify({ name })
  });
  
  if (res && res.success) {
    currentUser = res.user;
    showApp();
    await loadData();
    showToast('登录成功', 'success');
  } else {
    btn.disabled = false;
    btn.textContent = '进入系统';
  }
}

// ========== 退出登录 ==========
async function logout() {
  await api('/api/logout', { method: 'POST' });
  currentUser = null;
  window.selectedUserName = null;
  
  document.getElementById('loginPage').classList.add('active');
  document.getElementById('appContainer').classList.add('hidden');
  document.getElementById('loginBtn').disabled = true;
  document.getElementById('loginBtn').textContent = '进入系统';
  
  // 移除选中状态
  document.querySelectorAll('.user-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  showToast('已退出登录');
}

// ========== Tab 切换 ==========
function switchTab(tabName) {
  // 更新 Tab 样式
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
  // 更新页面显示
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  const pageMap = {
    'home': 'homePage',
    'form': 'formPage',
    'records': 'recordsPage',
    'profile': 'profilePage'
  };
  
  document.getElementById(pageMap[tabName]).classList.add('active');
  
  // 刷新数据
  if (tabName === 'home') {
    loadDashboardStats();
  } else if (tabName === 'records') {
    loadRecords();
  } else if (tabName === 'profile') {
    loadMyStats();
  }
}

// ========== 渲染物料标签 ==========
function renderMaterialTags() {
  const container = document.getElementById('materialTags');
  container.innerHTML = materials.map(m => `
    <div class="material-tag" data-material="${m}" onclick="selectMaterial(this)">${m}</div>
  `).join('');
}

// ========== 选择物料 ==========
function selectMaterial(el) {
  // 移除之前的选中状态
  document.querySelectorAll('.material-tag').forEach(tag => {
    tag.classList.remove('selected');
  });
  
  // 添加选中状态
  el.classList.add('selected');
  
  // 设置隐藏字段
  document.getElementById('formMaterial').value = el.dataset.material;
}

// ========== 渲染验收员网格 ==========
function renderInspectorGrids() {
  const inspectors = users.filter(u => u.role === 'inspector' || u.role === 'admin' || u.role === 'statistician');
  
  const grid1 = document.getElementById('inspector1Grid');
  const grid2 = document.getElementById('inspector2Grid');
  
  const html = inspectors.map(user => `
    <div class="inspector-item" data-name="${user.name}" onclick="selectInspector(this, 1)">
      <div class="avatar">${user.avatar || '👤'}</div>
      <div class="name">${user.name}</div>
    </div>
  `).join('');
  
  grid1.innerHTML = html;
  grid2.innerHTML = html;
  
  // 同时更新编辑模态框的选项
  const selectHtml = '<option value="">请选择</option>' + inspectors.map(user => 
    `<option value="${user.name}">${user.name}</option>`
  ).join('');
  
  document.getElementById('editMaterial').innerHTML = selectHtml;
  document.getElementById('editInspector1').innerHTML = selectHtml;
  document.getElementById('editInspector2').innerHTML = selectHtml;
}

// ========== 选择验收员 ==========
function selectInspector(el, num) {
  // 获取当前网格
  const grid = num === 1 ? 'inspector1Grid' : 'inspector2Grid';
  const hiddenField = num === 1 ? 'formInspector1' : 'formInspector2';
  
  // 移除同组内的选中状态
  document.querySelectorAll(`#${grid} .inspector-item`).forEach(item => {
    item.classList.remove('selected');
  });
  
  // 添加选中状态
  el.classList.add('selected');
  
  // 设置隐藏字段
  document.getElementById(hiddenField).value = el.dataset.name;
}

// ========== 更新仪表盘统计 ==========
function updateDashboardStats(stats) {
  document.getElementById('weekCount').textContent = stats.week_count;
  document.getElementById('monthCount').textContent = stats.month_count;
  document.getElementById('materialTypes').textContent = stats.material_types;
  
  // 趋势箭头
  const trendEl = document.getElementById('weekTrend');
  if (stats.week_change > 0) {
    trendEl.textContent = ' ↑' + stats.week_change;
    trendEl.className = 'trend up';
  } else if (stats.week_change < 0) {
    trendEl.textContent = ' ↓' + Math.abs(stats.week_change);
    trendEl.className = 'trend down';
  } else {
    trendEl.textContent = '';
  }
}

// ========== 渲染图表 ==========
function renderCharts(stats) {
  renderTrendChart(stats.trend_data);
  renderMaterialChart(stats.material_dist);
}

// ========== 渲染趋势图 ==========
function renderTrendChart(data) {
  const ctx = document.getElementById('trendChart').getContext('2d');
  
  if (trendChart) {
    trendChart.destroy();
  }
  
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        label: '异常数',
        data: data.map(d => d.count),
        borderColor: '#1a73e8',
        backgroundColor: 'rgba(26, 115, 232, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#1a73e8',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            font: { size: 10 }
          },
          grid: { color: '#f0f0f0' }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 } }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  });
}

// ========== 渲染物料饼图 ==========
function renderMaterialChart(data) {
  const ctx = document.getElementById('materialChart').getContext('2d');
  
  if (materialChart) {
    materialChart.destroy();
  }
  
  const colors = data.map(d => materialColors[d.name] || '#607d8b');
  
  materialChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.name),
      datasets: [{
        data: data.map(d => d.value),
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 12,
            font: { size: 11 },
            usePointStyle: true,
            pointStyle: 'circle'
          }
        }
      }
    }
  });
}

// ========== 渲染记录列表 ==========
function renderRecords() {
  const container = document.getElementById('recordsList');
  const emptyState = document.getElementById('emptyState');
  
  // 筛选记录
  let filteredRecords = records;
  const now = new Date();
  
  if (currentFilter === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filteredRecords = records.filter(r => new Date(r.date) >= weekAgo);
  } else if (currentFilter === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    filteredRecords = records.filter(r => new Date(r.date) >= monthStart);
  }
  
  if (filteredRecords.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  
  container.innerHTML = filteredRecords.map(record => {
    const color = materialColors[record.material_name] || '#607d8b';
    const canEdit = currentUser.role === 'admin' || currentUser.created_by === currentUser.name;
    
    return `
      <div class="timeline-item">
        <div class="timeline-line">
          <div class="timeline-dot"></div>
          <div class="timeline-track"></div>
        </div>
        <div class="timeline-content">
          <div class="record-header">
            <span class="record-material" style="background: ${color}">${record.material_name}</span>
            <span class="record-date">${record.date}</span>
          </div>
          <div class="record-body">
            <div class="record-row">
              <span class="label">供货单位</span>
              <span class="value">${record.supplier || '-'}</span>
            </div>
            <div class="record-row">
              <span class="label">车号</span>
              <span class="value">${record.truck_no || '-'}</span>
            </div>
            <div class="record-desc">${record.abnormal_desc || '-'}</div>
          </div>
          <div class="record-footer">
            <div class="record-inspectors">
              <div class="record-inspector-avatar" title="${record.inspector1}">
                ${getInspectorAvatar(record.inspector1)}
              </div>
              <div class="record-inspector-avatar" title="${record.inspector2}">
                ${getInspectorAvatar(record.inspector2)}
              </div>
            </div>
            <div class="record-actions">
              ${canEdit ? `
                <button class="record-action edit" onclick="editRecord(${record.id})" title="编辑">✏️</button>
                <button class="record-action delete" onclick="showDeleteConfirm(${record.id})" title="删除">🗑️</button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ========== 获取验收员头像 ==========
function getInspectorAvatar(name) {
  const user = users.find(u => u.name === name);
  return user ? (user.avatar || '👤') : '👤';
}

// ========== 提交表单 ==========
async function submitForm() {
  // 验证必填字段
  const date = document.getElementById('formDate').value;
  const material = document.getElementById('formMaterial').value;
  const supplier = document.getElementById('formSupplier').value.trim();
  const truck = document.getElementById('formTruck').value.trim();
  const desc = document.getElementById('formDesc').value.trim();
  const inspector1 = document.getElementById('formInspector1').value;
  const inspector2 = document.getElementById('formInspector2').value;
  
  if (!date || !material || !supplier || !truck || !desc || !inspector1 || !inspector2) {
    showToast('请填写完整信息', 'warning');
    return;
  }
  
  if (inspector1 === inspector2) {
    showToast('两个验收员不能相同', 'warning');
    return;
  }
  
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = '提交中...';
  
  const res = await api('/api/records', {
    method: 'POST',
    body: JSON.stringify({
      date,
      material_name: material,
      supplier,
      truck_no: truck,
      abnormal_desc: desc,
      inspector1,
      inspector2
    })
  });
  
  btn.disabled = false;
  btn.textContent = '提交异常信息';
  
  if (res && res.success) {
    showSuccessAnimation();
    showToast('提交成功', 'success');
    
    // 重置表单
    resetForm();
    
    // 刷新数据
    await loadRecords();
    await loadDashboardStats();
    
    // 跳转到记录页
    switchTab('records');
  }
}

// ========== 重置表单 ==========
function resetForm() {
  document.getElementById('formDate').value = '';
  document.getElementById('formMaterial').value = '';
  document.getElementById('formSupplier').value = '';
  document.getElementById('formTruck').value = '';
  document.getElementById('formDesc').value = '';
  document.getElementById('formInspector1').value = '';
  document.getElementById('formInspector2').value = '';
  document.getElementById('charCount').textContent = '0';
  
  // 清除选中状态
  document.querySelectorAll('.material-tag').forEach(tag => tag.classList.remove('selected'));
  document.querySelectorAll('.inspector-item').forEach(item => item.classList.remove('selected'));
}

// ========== 编辑记录 ==========
async function editRecord(id) {
  const record = records.find(r => r.id === id);
  if (!record) return;
  
  document.getElementById('editId').value = id;
  document.getElementById('editDate').value = record.date;
  document.getElementById('editMaterial').value = record.material_name;
  document.getElementById('editSupplier').value = record.supplier;
  document.getElementById('editTruck').value = record.truck_no;
  document.getElementById('editDesc').value = record.abnormal_desc;
  document.getElementById('editInspector1').value = record.inspector1;
  document.getElementById('editInspector2').value = record.inspector2;
  
  document.getElementById('editModal').classList.add('show');
}

// ========== 关闭编辑模态框 ==========
function closeEditModal() {
  document.getElementById('editModal').classList.remove('show');
}

// ========== 保存编辑 ==========
async function saveEdit() {
  const id = document.getElementById('editId').value;
  
  const data = {
    date: document.getElementById('editDate').value,
    material_name: document.getElementById('editMaterial').value,
    supplier: document.getElementById('editSupplier').value,
    truck_no: document.getElementById('editTruck').value,
    abnormal_desc: document.getElementById('editDesc').value,
    inspector1: document.getElementById('editInspector1').value,
    inspector2: document.getElementById('editInspector2').value
  };
  
  const res = await api(`/api/records/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  
  if (res && res.success) {
    closeEditModal();
    showToast('保存成功', 'success');
    await loadRecords();
    await loadDashboardStats();
  }
}

// ========== 显示删除确认 ==========
function showDeleteConfirm(id) {
  deleteTargetId = id;
  document.getElementById('deleteModal').classList.add('show');
}

// ========== 关闭删除确认 ==========
function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById('deleteModal').classList.remove('show');
}

// ========== 确认删除 ==========
async function confirmDelete() {
  if (!deleteTargetId) return;
  
  const res = await api(`/api/records/${deleteTargetId}`, {
    method: 'DELETE'
  });
  
  closeDeleteModal();
  
  if (res && res.success) {
    showToast('删除成功', 'success');
    await loadRecords();
    await loadDashboardStats();
  }
}

// ========== 导出模态框 ==========
function showExportModal() {
  document.getElementById('exportModal').classList.add('show');
}

function closeExportModal() {
  document.getElementById('exportModal').classList.remove('show');
}

// ========== 导出Excel ==========
async function doExport() {
  const period = document.querySelector('input[name="exportPeriod"]:checked').value;
  
  let url = '/api/export';
  
  if (period === 'custom') {
    const startDate = document.getElementById('exportStartDate').value;
    const endDate = document.getElementById('exportEndDate').value;
    if (!startDate || !endDate) {
      showToast('请选择日期范围', 'warning');
      return;
    }
    url += `?start=${startDate}&end=${endDate}`;
  } else if (period === 'week') {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    url += `?start=${weekAgo.toISOString().split('T')[0]}&end=${now.toISOString().split('T')[0]}`;
  } else if (period === 'month') {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    url += `?start=${monthStart.toISOString().split('T')[0]}&end=${now.toISOString().split('T')[0]}`;
  }
  
  closeExportModal();
  showToast('正在生成Excel...', 'success');
  
  // 触发下载
  const res = await api(url);
  
  if (res && res.success) {
    // 延迟一下再下载，让用户看到提示
    setTimeout(() => {
      window.location.href = `/api/download/${res.filename}`;
      showToast('导出成功', 'success');
    }, 500);
  }
}

// ========== 关于模态框 ==========
function showAboutModal() {
  document.getElementById('aboutModal').classList.add('show');
}

function closeAboutModal() {
  document.getElementById('aboutModal').classList.remove('show');
}

// ========== 事件绑定 ==========
document.addEventListener('DOMContentLoaded', () => {
  // 登录按钮
  document.getElementById('loginBtn').addEventListener('click', doLogin);
  
  // Tab 切换
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });
  
  // 提交按钮
  document.getElementById('submitBtn').addEventListener('click', submitForm);
  
  // 字数统计
  document.getElementById('formDesc').addEventListener('input', (e) => {
    document.getElementById('charCount').textContent = e.target.value.length;
  });
  
  // 日期默认今天
  document.getElementById('formDate').valueAsDate = new Date();
  
  // 筛选按钮
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderRecords();
    });
  });
  
  // 菜单按钮
  document.getElementById('menuLogout').addEventListener('click', logout);
  document.getElementById('menuExport').addEventListener('click', showExportModal);
  document.getElementById('menuAbout').addEventListener('click', showAboutModal);
  
  // 导出日期自定义切换
  document.querySelectorAll('input[name="exportPeriod"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const customRange = document.getElementById('customDateRange');
      if (e.target.value === 'custom') {
        customRange.classList.remove('hidden');
      } else {
        customRange.classList.add('hidden');
      }
    });
  });
  
  // 点击模态框外部关闭
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('show');
      }
    });
  });
  
  // 初始化
  init();
});
