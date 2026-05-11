// === VIEW MANAGEMENT ===
function switchView(viewId) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  
  document.getElementById(`view-${viewId}`).classList.add('active');
  document.querySelector(`.nav-item[onclick="switchView('${viewId}')"]`).classList.add('active');

  // Load specific data when switching views
  if (viewId === 'rules') loadRules();
  if (viewId === 'security') { loadMembers(); loadFaceLogs(); }
  if (viewId === 'analytics') { fetchHistory(); loadEnergy(); }
}

// === CLOCK & UTILS ===
setInterval(() => {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString('vi-VN');
}, 1000);

// === WEBSOCKET (REAL-TIME DATA) ===
let ws;
let chartInstance = null;

function connectWebSocket() {
  const wsProto = window.location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${wsProto}://${window.location.host}/ws/sensors`);

  const badge = document.getElementById('conn-badge');

  ws.onopen = () => {
    badge.innerHTML = `<i class="fas fa-circle dot" style="display:inline-block;margin-right:4px"></i> Đã kết nối`;
    badge.style.color = "var(--accent-green)";
  };

  ws.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);
      if (data.type === 'sensors') updateSensors(data.data);
      if (data.type === 'chat') addChatMessage(data.data);
      if (data.type === 'devices') updateDevices(data.data);
    } catch(e) {}
  };

  ws.onclose = () => {
    badge.innerHTML = `<i class="fas fa-circle" style="color:var(--accent-red);margin-right:4px"></i> Mất kết nối`;
    badge.style.color = "var(--accent-red)";
    setTimeout(connectWebSocket, 3000);
  };
}

function updateSensors(d) {
  if (d.temp !== undefined) document.getElementById('val-temp').textContent = d.temp;
  if (d.humi !== undefined) document.getElementById('val-humi').textContent = d.humi;
  if (d.gas !== undefined) document.getElementById('val-gas').textContent = d.gas;
}

function updateDevices(d) {
  const map = {
    led: { sw: 'sw-led', st: 'st-led', wrapper: 'ctrl-led', onText: 'Sáng', offText: 'Tắt' },
    fan: { sw: 'sw-fan', st: 'st-fan', wrapper: 'ctrl-fan', onText: 'Quay', offText: 'Tắt' },
    pump:{ sw: 'sw-pump', st: 'st-pump', wrapper: 'ctrl-pump', onText: 'Bơm', offText: 'Tắt' },
    door:{ sw: 'sw-door', st: 'st-door', wrapper: 'ctrl-door', onText: 'Mở', offText: 'Đóng', onVal: 90 }
  };
  
  for (let key in map) {
    if (d[key] !== undefined) {
      let m = map[key];
      let isOn = (m.onVal ? d[key] == m.onVal : d[key] == 1);
      
      document.getElementById(m.sw).checked = isOn;
      document.getElementById(m.st).textContent = isOn ? m.onText : m.offText;
      
      if(isOn) document.getElementById(m.wrapper).classList.add('active');
      else document.getElementById(m.wrapper).classList.remove('active');
    }
  }
}

async function sendControl(device, value) {
  try {
    await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device, value })
    });
  } catch (e) {
    console.error("Lỗi điều khiển:", e);
  }
}

// === AUTOMATION RULES ===
function showRuleModal() {
  document.getElementById('modal-rule').classList.add('show');
}
function hideRuleModal() {
  document.getElementById('modal-rule').classList.remove('show');
}

async function loadRules() {
  try {
    const res = await fetch('/api/rules');
    const data = await res.json();
    const tbody = document.getElementById('rules-tbody');
    
    if (data.rules.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-dim)">Chưa có kịch bản nào.</td></tr>`;
      return;
    }
    
    tbody.innerHTML = data.rules.map(r => `
      <tr>
        <td style="font-weight:600">${r.name}</td>
        <td>
          <span class="badge" style="background:var(--glass-bg)">${r.condition_field} ${r.condition_op} ${r.condition_value}</span>
        </td>
        <td>
          <i class="fas fa-arrow-right text-cyan" style="margin-right:8px"></i> ${r.action_device} = ${r.action_state}
        </td>
        <td>${r.notify_telegram ? '<i class="fas fa-paper-plane text-blue"></i> Telegram' : '-'}</td>
        <td>
          <label class="switch" style="transform:scale(0.8)">
            <input type="checkbox" ${r.enabled ? 'checked' : ''} onchange="toggleRule(${r.id})">
            <span class="slider"></span>
          </label>
        </td>
        <td>
          <button class="btn btn-danger" style="padding:6px 12px" onclick="deleteRule(${r.id})"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  } catch(e) { console.error(e); }
}

async function saveRule() {
  const rule = {
    name: document.getElementById('rule-name').value,
    condition_field: document.getElementById('rule-sensor').value,
    condition_op: document.getElementById('rule-op').value,
    condition_value: parseFloat(document.getElementById('rule-val').value),
    action_device: document.getElementById('rule-device').value,
    action_state: parseInt(document.getElementById('rule-action').value),
    notify_telegram: document.getElementById('rule-notify').checked,
    enabled: true
  };
  
  if (!rule.name) return alert('Vui lòng nhập tên kịch bản');
  
  try {
    await fetch('/api/rules', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(rule)
    });
    hideRuleModal();
    loadRules();
  } catch(e) { console.error(e); }
}

async function deleteRule(id) {
  if(!confirm("Xóa kịch bản này?")) return;
  await fetch(`/api/rules/${id}`, { method: 'DELETE' });
  loadRules();
}

async function toggleRule(id) {
  await fetch(`/api/rules/${id}/toggle`, { method: 'PATCH' });
}

// === SECURITY & AI ===
async function loadMembers() {
  try {
    const res = await fetch('/api/face/members');
    const data = await res.json();
    const list = document.getElementById('members-list');
    
    if (data.members.length === 0) {
      list.innerHTML = `<div style="color:var(--text-dim)">Chưa có dữ liệu khuôn mặt.</div>`;
      return;
    }
    
    list.innerHTML = data.members.map(m => `
      <div style="background:rgba(0,0,0,0.2);padding:12px 16px;border-radius:12px;display:flex;justify-content:space-between;border:1px solid var(--glass-border)">
        <div><i class="fas fa-user-check text-cyan" style="margin-right:8px"></i> <strong>${m.name}</strong></div>
        <div style="color:var(--text-dim);font-size:0.85rem">${m.samples} mẫu ảnh</div>
      </div>
    `).join('');
  } catch(e) {}
}

async function startEnroll() {
  const name = document.getElementById('inp-name').value;
  const samples = document.getElementById('inp-samples').value;
  const status = document.getElementById('enroll-status');
  
  if (!name) return status.innerHTML = "⚠️ Nhập tên trước!";
  
  status.innerHTML = `<i class="fas fa-spinner fa-spin text-cyan"></i> Đang lấy mẫu khuôn mặt. Hãy nhìn vào camera...`;
  try {
    const res = await fetch('/api/face/enroll', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ person_name: name, num_samples: parseInt(samples) })
    });
    if(res.ok) {
      status.innerHTML = "✅ Lấy mẫu thành công! Bấm 'Huấn luyện AI' để áp dụng.";
      setTimeout(loadMembers, 3000);
    } else {
      status.innerHTML = "❌ Lỗi lấy mẫu.";
    }
  } catch(e) {}
}

async function trainModel() {
  const status = document.getElementById('enroll-status');
  status.innerHTML = `<i class="fas fa-spinner fa-spin text-purple"></i> Đang huấn luyện AI. Xin chờ...`;
  try {
    await fetch('/api/face/train', { method: 'POST' });
    status.innerHTML = "✅ Huấn luyện hoàn tất. Đã nạp Model mới.";
  } catch(e) {}
}

async function loadFaceLogs() {
  try {
    const res = await fetch('/api/face/log');
    const data = await res.json();
    const list = document.getElementById('face-log-list');
    
    if (data.events.length === 0) {
      list.innerHTML = `<div style="color:var(--text-dim);grid-column:span 4">Chưa có nhật ký ra vào.</div>`;
      return;
    }
    
    list.innerHTML = data.events.map(ev => {
      const isStranger = ev.filename.includes('stranger');
      const badge = isStranger ? `<span class="badge badge-active" style="background:rgba(239,68,68,0.2);color:#ef4444;position:absolute;top:8px;right:8px">Người lạ</span>` 
                               : `<span class="badge badge-active" style="position:absolute;top:8px;right:8px">Mở cửa</span>`;
                               
      return `
      <div style="background:rgba(0,0,0,0.2);border-radius:12px;overflow:hidden;position:relative;border:1px solid var(--glass-border)">
        <img src="${ev.url}" style="width:100%;aspect-ratio:4/3;object-fit:cover" />
        ${badge}
        <div style="padding:12px;font-size:0.85rem">
          <div style="color:var(--text-dim)"><i class="fas fa-clock"></i> ${ev.time}</div>
        </div>
      </div>
    `}).join('');
  } catch(e) {}
}

// === VOICE CHAT ===
function addChatMessage(msg) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  const isUser = msg.role === 'user';
  div.style.padding = '8px 12px';
  div.style.borderRadius = '8px';
  div.style.background = isUser ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.05)';
  div.style.color = isUser ? 'var(--accent-cyan)' : 'var(--text-main)';
  div.style.marginBottom = '8px';
  div.innerHTML = `<strong>${isUser ? 'Bạn' : 'Yolo'}:</strong> ${msg.text}`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// === ANALYTICS & CHARTS ===
async function fetchHistory() {
  try {
    const res = await fetch('/api/history?hours=24');
    const data = await res.json();
    
    if (!chartInstance) {
      const ctx = document.getElementById('chart-sensor').getContext('2d');
      Chart.defaults.color = '#94a3b8';
      Chart.defaults.font.family = "'Outfit', sans-serif";
      
      chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [
            { label: 'Nhiệt độ (°C)', data: data.temp, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.4, fill: true },
            { label: 'Độ ẩm (%)', data: data.humi, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.4, fill: true }
          ]
        },
        options: {
          responsive: true,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' } }
          },
          plugins: {
            legend: { labels: { color: 'white', font: { size: 13 } } }
          }
        }
      });
    } else {
      chartInstance.data.labels = data.labels;
      chartInstance.data.datasets[0].data = data.temp;
      chartInstance.data.datasets[1].data = data.humi;
      chartInstance.update();
    }
  } catch(e) {}
}

async function loadEnergy() {
  try {
    const res = await fetch('/api/energy?hours=24');
    const data = await res.json();
    const container = document.getElementById('energy-report');
    
    container.innerHTML = Object.keys(data).map(dev => `
      <div class="device-item" style="flex-direction:column;align-items:flex-start;gap:8px">
        <div style="font-weight:600;color:var(--text-dim)"><i class="fas fa-plug"></i> ${dev.toUpperCase()}</div>
        <div style="font-size:1.8rem;font-weight:700;color:var(--accent-orange)">${data[dev].toFixed(2)} <span style="font-size:1rem;color:var(--text-dim)">giờ</span></div>
      </div>
    `).join('');
  } catch(e) {}
}

// INITIALIZE
connectWebSocket();
switchView('dashboard');
