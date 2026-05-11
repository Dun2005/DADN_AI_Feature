import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Zap, Shield, LineChart, LogOut, Cpu, Thermometer, Droplets, Wind, Lightbulb, Fan, DoorOpen, Droplet, UserPlus, Users, Clock, Brain, Activity, Plug } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [time, setTime] = useState(new Date().toLocaleTimeString('vi-VN'));

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString('vi-VN')), 1000);
    return () => clearInterval(timer);
  }, []);

  const menu = [
    { name: 'Tổng quan', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Tự động hoá', path: '/rules', icon: <Zap size={20} /> },
    { name: 'An ninh & AI', path: '/security', icon: <Shield size={20} /> },
    { name: 'Thống kê', path: '/analytics', icon: <LineChart size={20} /> },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <Cpu className="text-cyan" size={28} />
        YoloHome
      </div>
      <nav className="nav-menu">
        {menu.map(m => (
          <button 
            key={m.path} 
            className={`nav-item ${location.pathname === m.path ? 'active' : ''}`}
            onClick={() => navigate(m.path)}
          >
            {m.icon} {m.name}
          </button>
        ))}
      </nav>
      <div style={{ marginTop: 'auto' }}>
        <div className="glass-card" style={{ padding: '16px', textAlign: 'center', fontSize: '0.85rem' }}>
          <div style={{ color: 'var(--accent-green)', fontWeight: 600, marginBottom: '8px' }}>
            <div className="dot" style={{ display: 'inline-block', marginRight: '8px' }}></div>
            Trực tuyến
          </div>
          <div style={{ color: 'var(--text-dim)' }}>{time}</div>
        </div>
        <button className="nav-item mt-4 text-red" onClick={() => window.location.href='/logout'}>
          <LogOut size={20} /> Đăng xuất
        </button>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD VIEW
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard() {
  const [sensors, setSensors] = useState({ temp: '--', humi: '--', gas: '--' });
  const [devices, setDevices] = useState({ led: 0, fan: 0, pump: 0, door: 0 });

  useEffect(() => {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProto}//${window.location.host}/ws/sensors`);
    
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'sensors') {
          setSensors(prev => ({ ...prev, temp: data.data.temp ?? prev.temp, humi: data.data.humi ?? prev.humi, gas: data.data.gas ?? prev.gas }));
          setDevices(prev => ({ ...prev, 
            led: data.data.led ?? prev.led, 
            fan: data.data.fan ?? prev.fan, 
            pump: data.data.pump ?? prev.pump, 
            door: data.data.door ?? prev.door 
          }));
        }
      } catch (err) {}
    };
    return () => ws.close();
  }, []);

  const handleToggle = async (device, currentVal, onVal = 1) => {
    const newVal = currentVal === onVal ? 0 : onVal;
    setDevices(prev => ({ ...prev, [device]: newVal }));
    await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device, value: newVal })
    });
  };

  return (
    <div className="view-section" style={{ display: 'block' }}>
      <h1 className="view-title">Chào mừng về nhà 👋</h1>
      <div className="grid-dashboard">
        {/* SENSORS */}
        <div className="glass-card col-span-4 flex-col justify-between">
          <div className="sensor-top">
            <span className="card-title">Nhiệt độ</span>
            <div className="sensor-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)' }}>
              <Thermometer size={28} />
            </div>
          </div>
          <div className="sensor-value">{sensors.temp}<span className="sensor-unit">°C</span></div>
        </div>
        
        <div className="glass-card col-span-4 flex-col justify-between">
          <div className="sensor-top">
            <span className="card-title">Độ ẩm</span>
            <div className="sensor-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)' }}>
              <Droplets size={28} />
            </div>
          </div>
          <div className="sensor-value">{sensors.humi}<span className="sensor-unit">%</span></div>
        </div>

        <div className="glass-card col-span-4 flex-col justify-between">
          <div className="sensor-top">
            <span className="card-title">Khí Gas</span>
            <div className="sensor-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-orange)' }}>
              <Wind size={28} />
            </div>
          </div>
          <div className="sensor-value">{sensors.gas}<span className="sensor-unit">ppm</span></div>
        </div>

        {/* CAMERA */}
        <div className="glass-card col-span-7">
          <h2 className="card-title"><Shield className="text-cyan"/> Camera AI Theo dõi</h2>
          <div className="camera-container">
            <img src="/video_feed" onError={(e) => { e.target.style.display='none'; }} alt="Camera" />
            <div className="cam-overlay">
              <div className="dot"></div> Đang giám sát
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="glass-card col-span-5">
          <h2 className="card-title"><Zap className="text-purple"/> Điều khiển thiết bị</h2>
          <div className="control-grid mt-4">
            <div className={`device-item ${devices.led === 1 ? 'active' : ''}`}>
              <div className="device-info">
                <Lightbulb className="device-icon" />
                <div>
                  <div style={{ fontWeight: 600 }}>Đèn LED</div>
                  <div className="text-dim" style={{ fontSize: '0.8rem' }}>{devices.led === 1 ? 'Sáng' : 'Tắt'}</div>
                </div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={devices.led === 1} onChange={() => handleToggle('led', devices.led)} />
                <span className="slider"></span>
              </label>
            </div>

            <div className={`device-item ${devices.fan === 1 ? 'active' : ''}`}>
              <div className="device-info">
                <Fan className="device-icon" />
                <div>
                  <div style={{ fontWeight: 600 }}>Quạt</div>
                  <div className="text-dim" style={{ fontSize: '0.8rem' }}>{devices.fan === 1 ? 'Quay' : 'Tắt'}</div>
                </div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={devices.fan === 1} onChange={() => handleToggle('fan', devices.fan)} />
                <span className="slider"></span>
              </label>
            </div>

            <div className={`device-item ${devices.door === 90 ? 'active' : ''}`}>
              <div className="device-info">
                <DoorOpen className="device-icon" />
                <div>
                  <div style={{ fontWeight: 600 }}>Cửa chính</div>
                  <div className="text-dim" style={{ fontSize: '0.8rem' }}>{devices.door === 90 ? 'Mở' : 'Đóng'}</div>
                </div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={devices.door === 90} onChange={() => handleToggle('door', devices.door, 90)} />
                <span className="slider"></span>
              </label>
            </div>

            <div className={`device-item ${devices.pump === 1 ? 'active' : ''}`}>
              <div className="device-info">
                <Droplet className="device-icon" />
                <div>
                  <div style={{ fontWeight: 600 }}>Máy bơm</div>
                  <div className="text-dim" style={{ fontSize: '0.8rem' }}>{devices.pump === 1 ? 'Bơm' : 'Tắt'}</div>
                </div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={devices.pump === 1} onChange={() => handleToggle('pump', devices.pump)} />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RULES VIEW
// ─────────────────────────────────────────────────────────────────────────────
function Rules() {
  const [rules, setRules] = useState([]);
  
  const fetchRules = () => {
    fetch('/api/rules').then(r => r.json()).then(d => setRules(d.rules || []));
  };
  useEffect(() => { fetchRules(); }, []);

  const toggleRule = async (id) => {
    await fetch(`/api/rules/${id}/toggle`, { method: 'PATCH' });
    fetchRules();
  };

  const deleteRule = async (id) => {
    if(!confirm('Xoá kịch bản này?')) return;
    await fetch(`/api/rules/${id}`, { method: 'DELETE' });
    fetchRules();
  };

  return (
    <div className="view-section" style={{ display: 'block' }}>
      <div className="flex justify-between items-center mb-4">
        <h1 className="view-title" style={{ margin: 0 }}>Tự động hoá ⚙️</h1>
      </div>
      <div className="glass-card">
        <table>
          <thead>
            <tr>
              <th>Tên Kịch Bản</th>
              <th>Điều Kiện</th>
              <th>Hành Động</th>
              <th>Bật/Tắt</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td><span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>{r.condition_field} {r.condition_op} {r.condition_value}</span></td>
                <td><span className="text-cyan">{r.action_device} = {r.action_state}</span></td>
                <td>
                  <label className="switch" style={{ transform: 'scale(0.8)' }}>
                    <input type="checkbox" checked={r.enabled} onChange={() => toggleRule(r.id)} />
                    <span className="slider"></span>
                  </label>
                </td>
                <td><button className="btn btn-danger" onClick={() => deleteRule(r.id)}>Xoá</button></td>
              </tr>
            ))}
            {rules.length === 0 && <tr><td colSpan="5" style={{ textAlign:'center', color:'var(--text-dim)' }}>Chưa có kịch bản nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY VIEW (Face Enrollment & Logs)
// ─────────────────────────────────────────────────────────────────────────────
function Security() {
  const [members, setMembers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [enrollName, setEnrollName] = useState('');
  const [enrollSamples, setEnrollSamples] = useState(30);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const mRes = await fetch('/api/face/members?t=' + Date.now());
      const mData = await mRes.json();
      setMembers(mData.members || []);
      
      const lRes = await fetch('/api/face/log?t=' + Date.now());
      const lData = await lRes.json();
      setLogs(lData.events || []);
    } catch(e) {}
  };

  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleEnroll = async () => {
    if (!enrollName) return setStatus('⚠️ Vui lòng nhập tên.');
    setLoading(true);
    setStatus('📷 Đang quét khuôn mặt. Vui lòng nhìn thẳng vào camera...');
    try {
      const res = await fetch('/api/face/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person_name: enrollName, num_samples: enrollSamples })
      });
      if (res.ok) {
        setStatus('✅ Quét hoàn tất! Hãy nhấn Huấn Luyện AI.');
        fetchData();
      } else {
        setStatus('❌ Lỗi trong quá trình quét.');
      }
    } catch (e) {
      setStatus('❌ Lỗi kết nối.');
    }
    setLoading(false);
  };

  const handleTrain = async () => {
    setLoading(true);
    setStatus('🧠 Đang huấn luyện mô hình LBPH...');
    try {
      await fetch('/api/face/train', { method: 'POST' });
      setStatus('✅ Huấn luyện hoàn tất! Sẵn sàng nhận diện.');
    } catch(e) {
      setStatus('❌ Lỗi huấn luyện.');
    }
    setLoading(false);
  };

  return (
    <div className="view-section" style={{ display: 'block' }}>
      <h1 className="view-title">An Ninh & Khuôn Mặt 🛡️</h1>
      
      <div className="grid-dashboard mb-4">
        {/* ENROLLMENT */}
        <div className="glass-card col-span-6">
          <h2 className="card-title"><UserPlus className="text-cyan"/> Đăng ký thành viên</h2>
          <p className="text-dim mb-4" style={{ fontSize: '0.9rem' }}>Hệ thống sẽ dùng camera chụp mẫu khuôn mặt để AI nhận diện.</p>
          
          <div className="flex gap-3 mb-4">
            <input 
              type="text" 
              placeholder="Nhập tên (VD: Cong)" 
              value={enrollName} 
              onChange={e => setEnrollName(e.target.value)}
              style={{ flex: 1, padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', outline: 'none' }}
            />
            <input 
              type="number" 
              value={enrollSamples} 
              onChange={e => setEnrollSamples(e.target.value)}
              style={{ width: '80px', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', outline: 'none' }}
            />
          </div>
          
          <div className="flex gap-3">
            <button className="btn btn-primary" onClick={handleEnroll} disabled={loading}>
              <Shield size={18} /> Bắt đầu quét
            </button>
            <button className="btn" style={{ background: 'var(--accent-purple)', color: 'white' }} onClick={handleTrain} disabled={loading}>
              <Brain size={18} /> Huấn luyện AI
            </button>
          </div>
          {status && <div className="mt-4" style={{ color: 'var(--accent-cyan)' }}>{status}</div>}
        </div>

        {/* MEMBER LIST */}
        <div className="glass-card col-span-6">
          <h2 className="card-title"><Users className="text-purple"/> Thành viên đã đăng ký</h2>
          <div className="flex flex-col gap-3">
            {members.length === 0 ? <div className="text-dim">Chưa có ai đăng ký.</div> : null}
            {members.map(m => (
              <div key={m.name} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                <div className="text-dim" style={{ fontSize: '0.85rem' }}>{m.samples} mẫu ảnh</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FACE LOGS */}
      <div className="glass-card">
        <h2 className="card-title"><Clock className="text-cyan"/> Nhật ký ra vào cửa</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {logs.length === 0 ? <div className="text-dim">Chưa có lịch sử nhận diện.</div> : null}
          {logs.map((log, i) => {
            const isStranger = log.filename.includes('stranger');
            return (
              <div key={i} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                <img src={log.url} alt="Face Log" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} />
                <div style={{
                  position: 'absolute', top: '8px', right: '8px', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                  background: isStranger ? 'rgba(239,68,68,0.9)' : 'rgba(16,185,129,0.9)', color: 'white'
                }}>
                  {isStranger ? 'Người lạ' : 'Mở cửa'}
                </div>
                <div style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> {log.time}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function Analytics() {
  const [chartData, setChartData] = useState(null);
  const [energy, setEnergy] = useState({});

  useEffect(() => {
    // Fetch History
    fetch('/api/history?hours=24')
      .then(r => r.json())
      .then(d => {
        setChartData({
          labels: d.labels,
          datasets: [
            {
              label: 'Nhiệt độ (°C)',
              data: d.temp,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Độ ẩm (%)',
              data: d.humi,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4,
              fill: true
            }
          ]
        });
      });

    // Fetch Energy
    fetch('/api/energy?hours=24')
      .then(r => r.json())
      .then(d => setEnergy(d));
  }, []);

  const chartOptions = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
    },
    plugins: {
      legend: { labels: { color: 'white' } }
    }
  };

  return (
    <div className="view-section" style={{ display: 'block' }}>
      <h1 className="view-title">Thống Kê Dữ Liệu 📈</h1>
      
      <div className="glass-card mb-4">
        <h2 className="card-title"><Activity className="text-cyan"/> Biểu đồ môi trường (24h qua)</h2>
        <div style={{ height: '400px' }}>
          {chartData ? <Line data={chartData} options={chartOptions} /> : <div className="text-dim">Đang tải dữ liệu biểu đồ...</div>}
        </div>
      </div>

      <div className="glass-card">
        <h2 className="card-title"><Plug className="text-orange"/> Thời gian hoạt động thiết bị (24h qua)</h2>
        <div className="control-grid">
          {Object.entries(energy).map(([dev, hours]) => (
            <div key={dev} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>{dev}</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-orange)' }}>
                {parseFloat(hours).toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>giờ</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ROUTER
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/security" element={<Security />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
