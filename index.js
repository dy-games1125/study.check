const SUBJECTS = {
  elem: ['국어', '수학', '사회', '과학', '영어', '기타'],
  mid: ['국어', '수학', '사회', '과학', '영어', '기타'],
  high: ['국어', '수학', '영어', '한국사', '통합사회', '통합과학', '기타']
};

const QUOTES = [
  "💡 끝까지 해내기 전까지는 항상 불가능해 보인다.",
  "💡 오늘 흘린 땀방울이 내일의 기쁨이 된다.",
  "💡 성공은 매일 반복한 작은 노력들의 합이다.",
  "💡 배움은 결코 마음을 고달프게 하지 않는다.",
  "💡 지금 쉬면 꿈을 꾸지만, 지금 공부하면 꿈을 이룬다."
];

const BGM_SOURCES = {
  rain: { title: '🌧️ 빗소리', url: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg' },
  cafe: { title: '☕ 카페 소리', url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg' },
  waves: { title: '🌊 파도 소리', url: 'https://actions.google.com/sounds/v1/weather/ocean_waves.ogg' }
};

const SCHOOL_NAMES = { elem: '초등학생', mid: '중학생', high: '고등학생' };

let currentSchool = localStorage.getItem('study_school') || null;
let plans = JSON.parse(localStorage.getItem('study_plans')) || [];
let ddayData = JSON.parse(localStorage.getItem('study_dday')) || null;
let diaries = JSON.parse(localStorage.getItem('study_diaries')) || {};
let targetMinutes = parseInt(localStorage.getItem('study_target_minutes')) || 180;
let isDarkMode = localStorage.getItem('study_darkmode') === 'true';

let currentAudio = null;
let weeklyChartInstance = null;
let subjectChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  if (isDarkMode) document.body.classList.add('dark-mode');

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('plan-date').value = today;
  document.getElementById('view-date-picker').value = today;

  displayRandomQuote();

  if (!currentSchool) openSchoolModal();
  else initApp();

  document.getElementById('plan-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('view-date-picker').addEventListener('change', () => {
    renderPlans();
    loadDailyDiary();
  });

  setInterval(renderPlans, 60000);
});

function displayRandomQuote() {
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.getElementById('quote-text').textContent = quote;
}

// BGM 재생/정지
function playBGM(type) {
  if (currentAudio) currentAudio.pause();
  const bgm = BGM_SOURCES[type];
  if (!bgm) return;

  currentAudio = new Audio(bgm.url);
  currentAudio.loop = true;
  currentAudio.play();
  document.getElementById('bgm-status').textContent = `🎵 재생 중: ${bgm.title}`;
}

function stopBGM() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  document.getElementById('bgm-status').textContent = '재생 중인 음원 없음';
}

// 일일 목표 순공 시간 관리
function setDailyGoalPrompt() {
  const hours = prompt("하루 목표 공부 시간(시간 단위)을 입력하세요 (예: 3):", targetMinutes / 60);
  if (!hours || isNaN(hours)) return;
  targetMinutes = parseFloat(hours) * 60;
  localStorage.setItem('study_target_minutes', targetMinutes);
  renderGoalProgress();
}

function renderGoalProgress() {
  const selectedDate = document.getElementById('view-date-picker').value;
  const studiedMinutes = plans
    .filter(p => p.date === selectedDate && p.completed)
    .reduce((sum, p) => sum + (p.duration || 30), 0);

  document.getElementById('current-studied-time').textContent = `${studiedMinutes}분`;
  document.getElementById('target-study-time').textContent = `${targetMinutes}분`;

  const percent = Math.min(100, Math.round((studiedMinutes / targetMinutes) * 100));
  document.getElementById('goal-percentage-text').textContent = `${percent}%`;
  document.getElementById('goal-progress-fill').style.width = `${percent}%`;
}

// 공부 일기 관리
function saveDailyDiary() {
  const selectedDate = document.getElementById('view-date-picker').value;
  const content = document.getElementById('daily-diary-input').value.trim();
  diaries[selectedDate] = content;
  localStorage.setItem('study_diaries', JSON.stringify(diaries));
  alert('일기가 저장 되었습니다!');
}

function loadDailyDiary() {
  const selectedDate = document.getElementById('view-date-picker').value;
  document.getElementById('daily-diary-input').value = diaries[selectedDate] || '';
}

// 데이터 백업 및 복구
function exportData() {
  const data = { currentSchool, plans, ddayData, diaries, targetMinutes };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `study_check_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}

function importData() { document.getElementById('import-file-input').click(); }

function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = JSON.parse(evt.target.result);
      if (data.plans) localStorage.setItem('study_plans', JSON.stringify(data.plans));
      if (data.ddayData) localStorage.setItem('study_dday', JSON.stringify(data.ddayData));
      if (data.diaries) localStorage.setItem('study_diaries', JSON.stringify(data.diaries));
      if (data.currentSchool) localStorage.setItem('study_school', data.currentSchool);
      if (data.targetMinutes) localStorage.setItem('study_target_minutes', data.targetMinutes);
      alert('데이터가 성공적으로 복구되었습니다!');
      location.reload();
    } catch (err) {
      alert('올바르지 않은 백업 파일입니다.');
    }
  };
  reader.readAsText(file);
}

// 연속 달성(Streak) 계산
function calculateStreak() {
  const completedDates = new Set();
  plans.forEach(p => { if (p.completed) completedDates.add(p.date); });

  let streak = 0;
  let checkDate = new Date();
  const todayStr = checkDate.toISOString().split('T')[0];

  if (!completedDates.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (completedDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else break;
  }

  document.getElementById('streak-display').textContent = `🔥 ${streak}일 연속`;
}

function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle('dark-mode', isDarkMode);
  localStorage.setItem('study_darkmode', isDarkMode);
  renderCharts();
}

function setDdayPrompt() {
  const title = prompt("D-Day 목표 이름 (예: 수능):");
  if (!title) return;
  const dateStr = prompt("목표 날짜 (YYYY-MM-DD):");
  if (!dateStr) return;

  ddayData = { title, date: dateStr };
  localStorage.setItem('study_dday', JSON.stringify(ddayData));
  renderDday();
}

function renderDday() {
  const display = document.getElementById('dday-display');
  if (!ddayData) { display.textContent = '목표를 설정해주세요'; return; }
  const target = new Date(ddayData.date + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  
  const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) display.textContent = `🎉 ${ddayData.title} D-Day입니다!`;
  else if (diffDays > 0) display.textContent = `🎯 ${ddayData.title}까지 D-${diffDays}일`;
  else display.textContent = `🏁 ${ddayData.title} D+${Math.abs(diffDays)}일 지남`;
}

function requestNotificationPermission() {
  window.OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.Notifications.requestPermission();
    if (OneSignal.Notifications.permission) alert("알림 설정 완료!");
    else alert("알림 권한 거부됨");
  });
}

function openSchoolModal() { document.getElementById('school-modal').style.display = 'flex'; }
function setSchoolType(type) {
  currentSchool = type;
  localStorage.setItem('study_school', type);
  document.getElementById('school-modal').style.display = 'none';
  initApp();
}

function initApp() {
  document.getElementById('current-school-display').textContent = SCHOOL_NAMES[currentSchool];
  populateSubjects();
  renderDday();
  calculateStreak();
  loadDailyDiary();
  renderPlans();
  renderCharts();
}

function populateSubjects() {
  const select = document.getElementById('subject-select');
  select.innerHTML = '';
  const subjects = SUBJECTS[currentSchool] || SUBJECTS.elem;
  subjects.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub; opt.textContent = sub;
    select.appendChild(opt);
  });
  handleSubjectChange();
}

function handleSubjectChange() {
  const select = document.getElementById('subject-select');
  const customGroup = document.getElementById('custom-subject-group');
  if (select.value === '기타') {
    customGroup.style.display = 'block';
    document.getElementById('custom-subject').required = true;
  } else {
    customGroup.style.display = 'none';
    document.getElementById('custom-subject').required = false;
  }
}

function handleFormSubmit(e) {
  e.preventDefault();
  const editingId = document.getElementById('editing-id').value;
  const title = document.getElementById('plan-title').value.trim();
  const date = document.getElementById('plan-date').value;
  const startTime = document.getElementById('start-time').value;
  const duration = parseInt(document.getElementById('duration').value);

  if (duration < 30) return alert('최소 30분 이상 입력해주세요.');

  let subject = document.getElementById('subject-select').value;
  if (subject === '기타') {
    subject = document.getElementById('custom-subject').value.trim();
    if (!subject) return;
  }

  const [startHour, startMin] = startTime.split(':').map(Number);
  const startTotal = startHour * 60 + startMin;
  const endTotal = startTotal + duration;
  const endTime = `${String(Math.floor(endTotal / 60) % 24).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;

  const isOverlap = plans.some(p => {
    if (editingId && p.id === parseInt(editingId)) return false;
    if (p.date !== date) return false;
    const [psH, psM] = p.startTime.split(':').map(Number);
    const [peH, peM] = p.endTime.split(':').map(Number);
    return (startTotal < (peH * 60 + peM) && endTotal > (psH * 60 + psM));
  });

  if (isOverlap) return alert('해당 시간에 중복된 계획이 존재합니다.');

  if (editingId) {
    const plan = plans.find(p => p.id === parseInt(editingId));
    if (plan) {
      plan.title = title; plan.date = date; plan.startTime = startTime;
      plan.endTime = endTime; plan.subject = subject; plan.duration = duration;
    }
  } else {
    plans.push({ id: Date.now(), title, date, startTime, endTime, duration, subject, completed: false });
  }

  savePlans();
  cancelEdit();
  document.getElementById('view-date-picker').value = date;
  loadDailyDiary();
  renderPlans();
  renderCharts();
}

function editPlan(id) {
  const plan = plans.find(p => p.id === id);
  if (!plan) return;

  document.getElementById('editing-id').value = plan.id;
  document.getElementById('plan-title').value = plan.title;
  document.getElementById('plan-date').value = plan.date;
  document.getElementById('start-time').value = plan.startTime;
  document.getElementById('duration').value = plan.duration || 30;

  const select = document.getElementById('subject-select');
  if ([...select.options].some(o => o.value === plan.subject)) {
    select.value = plan.subject;
  } else {
    select.value = '기타';
    document.getElementById('custom-subject').value = plan.subject;
  }
  handleSubjectChange();

  document.getElementById('form-title').textContent = '✏️ 계획 수정하기';
  document.getElementById('submit-btn').textContent = '수정 완료';
  document.getElementById('cancel-edit-btn').style.display = 'block';
}

function cancelEdit() {
  document.getElementById('editing-id').value = '';
  document.getElementById('plan-title').value = '';
  document.getElementById('start-time').value = '';
  document.getElementById('custom-subject').value = '';
  document.getElementById('form-title').textContent = '📅 공부 계획 세우기';
  document.getElementById('submit-btn').textContent = '계획 추가하기';
  document.getElementById('cancel-edit-btn').style.display = 'none';
}

function deletePlan(id) {
  if (confirm("정말 이 계획을 삭제하시겠습니까?")) {
    plans = plans.filter(p => p.id !== id);
    savePlans();
    calculateStreak();
    renderPlans();
    renderCharts();
  }
}

function savePlans() { localStorage.setItem('study_plans', JSON.stringify(plans)); }

function renderPlans() {
  const selectedDate = document.getElementById('view-date-picker').value;
  const listContainer = document.getElementById('plan-list');
  listContainer.innerHTML = '';

  const dayPlans = plans.filter(p => p.date === selectedDate).sort((a,b) => a.startTime.localeCompare(b.startTime));
  
  renderGoalProgress();

  if (dayPlans.length === 0) {
    listContainer.innerHTML = '<p style="text-align:center; opacity:0.6; padding:20px;">등록된 계획이 없습니다.</p>';
    return;
  }

  const now = new Date();
  const currentDateStr = now.toISOString().split('T')[0];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  dayPlans.forEach(plan => {
    const item = document.createElement('div');
    const [endH, endM] = plan.endTime.split(':').map(Number);
    const isTimeReached = (selectedDate < currentDateStr) || (selectedDate === currentDateStr && currentMinutes >= (endH * 60 + endM));

    let statusClass = plan.completed ? 'done' : (isTimeReached ? 'failed' : '');
    item.className = `plan-item ${statusClass}`;

    let actionBtn = plan.completed
      ? '<span style="color:var(--success-color); font-weight:bold;">✓ 완료</span>'
      : `<button class="btn btn-success btn-sm" onclick="completePlan(${plan.id})" ${isTimeReached ? '' : 'disabled style="opacity:0.5;"'}>달성</button>`;

    item.innerHTML = `
      <div class="plan-info">
        <div class="time">🕒 ${plan.startTime} ~ ${plan.endTime} <span style="font-weight:bold; color:var(--primary-color);">[${plan.subject}]</span> (${plan.duration || 30}분)</div>
        <div class="subject">${plan.title}</div>
      </div>
      <div class="plan-actions">
        ${actionBtn}
        <button class="btn btn-outline btn-sm" onclick="editPlan(${plan.id})">수정</button>
        <button class="btn btn-danger btn-sm" onclick="deletePlan(${plan.id})">삭제</button>
      </div>
    `;
    listContainer.appendChild(item);
  });
}

function completePlan(id) {
  const plan = plans.find(p => p.id === id);
  if (plan) {
    plan.completed = true;
    savePlans();
    calculateStreak();
    renderPlans();
    renderCharts();
  }
}

function renderCharts() {
  renderWeeklyReport();
  renderSubjectDistributionChart();
}

function renderWeeklyReport() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const distanceToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + 7;
  
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - distanceToMonday);
  lastMonday.setHours(0,0,0,0);

  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23,59,59,999);

  const formatDate = d => `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  document.getElementById('weekly-date-range').textContent = `(${formatDate(lastMonday)} ~ ${formatDate(lastSunday)})`;

  const weekDays = ['월', '화', '수', '목', '금', '토', '일'];
  const dailyTotals = [0,0,0,0,0,0,0];
  const dailyCompleted = [0,0,0,0,0,0,0];

  let totalCount = 0, completedCount = 0;

  plans.forEach(plan => {
    const pDate = new Date(plan.date + 'T00:00:00');
    if (pDate >= lastMonday && pDate <= lastSunday) {
      let idx = pDate.getDay() - 1;
      if (idx === -1) idx = 6;
      dailyTotals[idx]++;
      totalCount++;
      if (plan.completed) { dailyCompleted[idx]++; completedCount++; }
    }
  });

  const rates = dailyTotals.map((t, i) => t > 0 ? Math.round((dailyCompleted[i] / t) * 100) : 0);
  const overallRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  document.getElementById('weekly-total').textContent = `${totalCount}개`;
  document.getElementById('weekly-completed').textContent = `${completedCount}개`;
  document.getElementById('weekly-rate').textContent = `${overallRate}%`;

  const ctx = document.getElementById('weeklyChart').getContext('2d');
  if (weeklyChartInstance) weeklyChartInstance.destroy();

  weeklyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: weekDays,
      datasets: [{
        data: rates,
        backgroundColor: 'rgba(74, 144, 226, 0.7)',
        borderColor: 'rgba(74, 144, 226, 1)',
        borderWidth: 1, borderRadius: 5
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } },
      plugins: { legend: { display: false } }
    }
  });
}

function renderSubjectDistributionChart() {
  const subjectTimes = {};
  plans.forEach(plan => {
    const duration = plan.duration || 30;
    subjectTimes[plan.subject] = (subjectTimes[plan.subject] || 0) + duration;
  });

  const labels = Object.keys(subjectTimes);
  const data = Object.values(subjectTimes);

  const ctx = document.getElementById('subjectDistributionChart').getContext('2d');
  if (subjectChartInstance) subjectChartInstance.destroy();
  if (labels.length === 0) return;

  subjectChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: ['#4a90e2', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#34495e', '#1abc9c']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: isDarkMode ? '#e0e0e0' : '#333' } }
      }
    }
  });
}
