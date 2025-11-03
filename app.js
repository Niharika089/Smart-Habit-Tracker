
// Smart Habit Tracker v5 - front-end only app
// Features: Welcome, Signup (name,email,pwd), Login (email,pwd), Dashboard, Habits, Sleep, Streaks, Charts
const root = document.getElementById('app');

// Simple templater
const T = (html)=>{const d=document.createElement('div');d.innerHTML=html;return d.firstElementChild;}

// Local DB helper (silent)
const DB = {
  key:'st_v5_users',
  users(){ return JSON.parse(localStorage.getItem(this.key)||'{}') },
  save(u){ localStorage.setItem(this.key, JSON.stringify(u)) },
  create(name,email,pwd){ const u=this.users(); if(u[email]) return false; u[email]={name,pwd,data:{habits:[],records:{},sleep:[],xp:0,ach:[]}}; this.save(u); return true; },
  validate(email,pwd){ const u=this.users(); return u[email] && u[email].pwd===pwd; },
  get(email){ return this.users()[email] }
}

// App shell
function Shell(){ return T(`<div class="app">
  <div class="header card">
    <div class="brand">Smart Habit Tracker</div>
    <div class="topbar nav">
      <div id="greeting" class="small">Welcome</div>
      <button id="navDashboard" class="btn ghost">Dashboard</button>
      <button id="navHabits" class="btn ghost">Habits</button>
      <button id="navSleep" class="btn ghost">Sleep</button>
      <button id="navStreaks" class="btn ghost">Streaks</button>
      <button id="navProfile" class="btn ghost">Profile</button>
      <label class="toggle"><input id="theme" type="checkbox"/> Dark</label>
      <button id="authBtn" class="btn">Login / Signup</button>
    </div>
  </div>
  <div id="content"></div>
</div>`); }

root.appendChild(Shell());
const content = document.getElementById('content');
const greeting = document.getElementById('greeting');
const authBtn = document.getElementById('authBtn');

document.getElementById('navDashboard').onclick = ()=> showDashboard();
document.getElementById('navHabits').onclick = ()=> showHabits();
document.getElementById('navSleep').onclick = ()=> showSleep();
document.getElementById('navStreaks').onclick = ()=> showStreaks();
document.getElementById('navProfile').onclick = ()=> showProfile();
document.getElementById('theme').onchange = (e)=> document.documentElement.toggleAttribute('data-theme', e.target.checked);
authBtn.onclick = ()=> showAuthChoice();

let currentUser = null; // email

// Welcome screen (always start)
function start(){
  showWelcome();
}
function showWelcome(){
  greeting.innerText = 'Welcome';
  content.innerHTML = `<div class="card center" style="padding:28px"><h2>Welcome to Smart Habit Tracker</h2><p class="small">Build your best habits with ease!</p><div style="margin-top:12px"><button class="btn" onclick="showAuth('login')">Login</button> <button class="btn ghost" onclick="showAuth('signup')">Signup</button></div></div>`;
}

// Auth choice (from top right)
function showAuthChoice(){ showAuth('login'); }

// Show auth form
function showAuth(mode){
  content.innerHTML = `<div class="card center" style="max-width:420px;margin:24px auto"><h3>${mode==='login'?'Login':'Signup'}</h3>`;
  if(mode==='signup') content.innerHTML += `<input id="name" class="input" placeholder="Name"/><br/>`;
  content.innerHTML += `<input id="email" class="input" placeholder="Email"/><br/><input id="password" type="password" class="input" placeholder="Password"/><br/><div style="margin-top:12px">`;
  if(mode==='login') content.innerHTML += `<button class="btn" onclick="handleLogin()">Login</button>`;
  else content.innerHTML += `<button class="btn" onclick="handleSignup()">Signup</button>`;
  content.innerHTML += ` <button class="btn ghost" onclick="showWelcome()">Back</button></div><p id="msg" class="small" style="margin-top:10px;color:var(--muted)"></p></div>`;
}

// Signup/login handlers
function handleSignup(){
  const name = (document.getElementById('name')||{}).value?.trim();
  const email = (document.getElementById('email')||{}).value?.trim();
  const pwd = (document.getElementById('password')||{}).value;
  if(!name||!email||!pwd){ alert('Please fill Name, Email, Password'); return; }
  if(DB.create(name,email,pwd)){ document.getElementById('msg').innerText = 'Account created successfully! Please login.'; setTimeout(()=>showAuth('login'),1200); }
  else alert('User exists — please login.');
}
function handleLogin(){
  const email = (document.getElementById('email')||{}).value?.trim();
  const pwd = (document.getElementById('password')||{}).value;
  if(!email||!pwd){ alert('Enter email and password'); return; }
  if(DB.validate(email,pwd)){ currentUser = email; const user = DB.get(email); greeting.innerText = 'Hi, '+(user.name||email); showDashboard(); }
  else alert('Invalid credentials');
}

// DASHBOARD
function showDashboard(){
  if(!currentUser){ showWelcome(); alert('Please login to access dashboard'); return; }
  const user = DB.get(currentUser);
  const data = user.data;
  // compute streaks and completion
  const streak = calcOverallStreak(data);
  content.innerHTML = `<div class="card"><h3>Dashboard</h3><div class="kpi" style="margin-top:10px">
    <div class="item"><div class="small">XP</div><div style="font-weight:700">${data.xp||0}</div></div>
    <div class="item"><div class="small">Habits</div><div style="font-weight:700">${data.habits.length}</div></div>
    <div class="item"><div class="small">Streak</div><div style="font-weight:700">${streak}</div></div>
  </div>
  <div style="margin-top:14px;display:flex;gap:12px;align-items:center">
    <div style="flex:1"><h4 class="small">Last 7 days completion</h4><canvas id="habitChart" class="canvas"></canvas></div>
    <div style="width:220px"><h4 class="small">Motivation</h4><div class="card" style="padding:12px"><div id="motText">Keep going — consistency builds habit!</div></div></div>
  </div></div>`;
  drawHabitChart();
}

// Habits
function showHabits(){
  if(!currentUser){ showWelcome(); alert('Please login'); return; }
  const user = DB.get(currentUser);
  const data = user.data;
  content.innerHTML = `<div class="card"><h3>Your Habits</h3><div style="margin-top:8px">
    <input id="hname" class="input" placeholder="Habit name"/><br/>
    <select id="hfreq" class="input"><option value="daily">Daily</option><option value="weekly">Weekly</option></select><br/>
    <button class="btn" onclick="addHabit()">Add Habit</button> <button class="btn ghost" onclick="showDashboard()">Back</button>
    </div><div id="habList" style="margin-top:12px"></div></div>`;
  renderHabits();
}

function addHabit(){
  const name = (document.getElementById('hname')||{}).value?.trim();
  const freq = (document.getElementById('hfreq')||{}).value||'daily';
  if(!name){ alert('Enter habit name'); return; }
  const users = DB.users();
  users[currentUser].data.habits.push({id:Math.random().toString(36).slice(2,9),name,frequency:freq,created:new Date().toISOString()});
  DB.save(users);
  renderHabits();
}

function renderHabits(){
  const list = document.getElementById('habList'); list.innerHTML='';
  const data = DB.get(currentUser).data;
  data.habits.forEach(h=>{
    const div = document.createElement('div'); div.className='habit';
    const doneToday = isDoneToday(h.id);
    div.innerHTML = `<div><div style="font-weight:700">${h.name}</div><div class="small">${h.frequency}</div></div>
      <div><button class="btn" onclick="toggleDone('${h.id}')">${doneToday? 'Done' : 'Mark'}</button> <button class="btn ghost" onclick="deleteHabit('${h.id}')">Delete</button></div>`;
    list.appendChild(div);
  });
}

function toggleDone(id){
  const users = DB.users();
  const data = users[currentUser].data;
  const key = todayKey();
  data.records[key] = data.records[key]||{};
  data.records[key][id] = data.records[key][id]||{done:false,count:0};
  data.records[key][id].done = !data.records[key][id].done;
  if(data.records[key][id].done) data.xp = (data.xp||0) + 5;
  DB.save(users);
  renderHabits();
}

// delete habit
function deleteHabit(id){
  const users = DB.users();
  users[currentUser].data.habits = users[currentUser].data.habits.filter(h=>h.id!==id);
  DB.save(users);
  renderHabits();
}

// Sleep
function showSleep(){
  if(!currentUser){ showWelcome(); alert('Please login'); return; }
  const data = DB.get(currentUser).data;
  content.innerHTML = `<div class="card"><h3>Sleep Tracker</h3>
    <div style="display:flex;gap:8px;align-items:center"><input id="bed" type="time" class="input" style="width:160px"/><input id="wake" type="time" class="input" style="width:160px"/>
    <select id="quality" class="input" style="width:140px"><option>Good</option><option>OK</option><option>Poor</option></select>
    <button class="btn" onclick="saveSleep()">Save</button></div>
    <div style="margin-top:12px"><h4 class="small">Recent</h4><div id="sleepList"></div><button class="btn ghost" onclick="showDashboard()">Back</button></div></div>`;
  renderSleep();
}
function saveSleep(){
  const bed = document.getElementById('bed').value, wake = document.getElementById('wake').value, quality = document.getElementById('quality').value;
  if(!bed||!wake){ alert('Select times'); return; }
  const users = DB.users(); const data = users[currentUser].data;
  const dur = computeDuration(bed,wake);
  data.sleep.push({date:todayKey(),bed,wake,quality,duration:dur});
  DB.save(users); renderSleep();
}
function renderSleep(){
  const list = document.getElementById('sleepList'); list.innerHTML='';
  const data = DB.get(currentUser).data;
  (data.sleep.slice().reverse().slice(0,7)).forEach(s=>{
    const div = document.createElement('div'); div.className='habit'; div.innerHTML = `<div><div style="font-weight:600">${s.date}</div><div class="small">${s.bed} → ${s.wake} · ${s.quality} · ${s.duration} hrs</div></div>`;
    list.appendChild(div);
  });
}

// Streaks & Motivation
function showStreaks(){
  if(!currentUser){ showWelcome(); alert('Please login'); return; }
  const data = DB.get(currentUser).data;
  const streaks = calcPerHabitStreaks(data);
  let html = `<div class="card"><h3>Streaks & Motivation</h3><div style="margin-top:10px">`;
  for(const s of streaks){ html += `<div class="habit"><div><div style="font-weight:700">${s.name}</div><div class="small">Streak: <strong>${s.streak}</strong></div></div><div><div class="badge">${s.streak} days</div></div></div>`; }
  html += `<div style="margin-top:12px"><button class="btn" onclick="showDashboard()">Back</button></div></div></div>`;
  content.innerHTML = html;
}

// Profile
function showProfile(){
  if(!currentUser){ showWelcome(); alert('Please login'); return; }
  const user = DB.get(currentUser);
  content.innerHTML = `<div class="card"><h3>Profile</h3><div style="margin-top:8px"><div class="small">Name</div><div style="font-weight:700">${user.name}</div><div style="margin-top:12px"><button class="btn ghost" onclick="logout()">Logout</button></div></div></div>`;
}

function logout(){ currentUser = null; greeting.innerText='Welcome'; showWelcome(); }

// Helpers
function todayKey(d=new Date()){ return d.toISOString().slice(0,10); }
function computeDuration(b,w){ const [bh,bm]=b.split(':').map(Number); const [wh,wm]=w.split(':').map(Number); let diff = wh*60+wm - (bh*60+bm); if(diff<0) diff+=24*60; return Math.round(diff/60*10)/10; }

function isDoneToday(hid){
  const data = DB.get(currentUser).data;
  const rec = data.records[todayKey()] || {};
  return rec[hid] && rec[hid].done;
}

// charts: simple bar chart for last 7 days completion
function drawHabitChart(){
  const canvas = document.getElementById('habitChart'); if(!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.clientWidth; canvas.height = 160;
  const labels = []; const vals = [];
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    const k = d.toISOString().slice(0,10);
    labels.push(k.slice(5));
    const rec = DB.get(currentUser).data.records[k] || {};
    let count=0; for(const id in rec){ if(rec[id].done) count++; }
    const total = Math.max(1, DB.get(currentUser).data.habits.length);
    vals.push(Math.round((count/total)*100));
  }
  // clear
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // draw bars
  const pad=30; const w=canvas.width; const h=canvas.height; const bw = (w-2*pad)/labels.length;
  ctx.font='12px sans-serif'; ctx.fillStyle='#444';
  for(let i=0;i<labels.length;i++){
    const x = pad + i*bw + 6; const barH = (h-2*pad)*(vals[i]/100);
    ctx.fillStyle = 'rgba(168,85,247,0.9)'; ctx.fillRect(x, h-pad-barH, bw-12, barH);
    ctx.fillStyle='#333'; ctx.fillText(labels[i], x, h-pad+14);
    ctx.fillText(vals[i]+'%', x, h-pad-barH-6);
  }
}

// streaks calculation
function calcPerHabitStreaks(data){
  const res=[];
  const habits = data.habits || [];
  for(const h of habits){
    let s=0;
    for(let i=0;i<30;i++){
      const d=new Date(); d.setDate(d.getDate()-i); const k=d.toISOString().slice(0,10);
      const rec = data.records[k] && data.records[k][h.id];
      if(rec && rec.done) s++; else break;
    }
    res.push({name:h.name,streak:s});
  }
  return res;
}
function calcOverallStreak(data){
  let s=0;
  for(let i=0;i<30;i++){
    const d=new Date(); d.setDate(d.getDate()-i); const k=d.toISOString().slice(0,10);
    const rec = data.records[k]||{};
    const any = Object.keys(rec).some(id=> rec[id] && rec[id].done);
    if(any) s++; else break;
  }
  return s;
}

// initial mount
showWelcome();
