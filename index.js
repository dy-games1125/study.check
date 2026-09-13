// 과목 데이터 정의
const SUBJECTS = {
  elem: ['국어', '수학', '사회', '과학', '영어', '기타'],
  mid: ['국어', '수학', '사회', '과학', '영어', '기타'],
  high: [
    '국어', '수학', '영어',
    '한국사', '통합사회', '통합과학',
    '물리학 I', '물리학 II', '화학 I', '화학 II',
    '생명과학 I', '생명과학 II', '지구과학 I', '지구과학 II',
    '기타'
  ]
};

const SCHOOL_NAMES = {
  elem: '초등학생',
  mid: '중학생',
  high: '고등학생'
};

// 앱 상태 변수
let currentSchool = localStorage.getItem('study_school') || null;
let plans = JSON.parse(localStorage.getItem('study_plans')) || [];
let chartInstance = null;

// DOM 로드 완료 시 실행
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('plan-date').value = today;
  document.getElementById('view-date-picker').value = today;

  if (!currentSchool) {
    openSchoolModal();
  } else {
    initApp();
  }

  document.getElementById('plan-form').addEventListener('submit', addPlan);
  document.getElementById('view-date-picker').addEventListener('change', renderPlans);

  // 1분마다 버튼 활성화 및 시간 상태 체크
  setInterval(renderPlans, 60000);
});

// 알림 권한 요청 (OneSignal)
function requestNotificationPermission() {
  window.OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.Notifications.requestPermission();
    if (OneSignal.Notifications.permission) {
      alert("알림 설정이 등록되었습니다! 앱을 닫아도 공부 시간에 알림이 옵니다.");
    } else {
      alert("알림 권한이 거부되었습니다.");
    }
  });
}

// 학교 선택 모달
function openSchoolModal() {
  document.getElementById('school-modal').style.display = 'flex';
}

function setSchoolType(type) {
  currentSchool = type;
  localStorage.setItem('study_school', type);
  document.getElementById('school-modal').style.display = 'none';
  initApp();
}

// 앱 초기화
function initApp() {
  document.getElementById('current-school-display').textContent = SCHOOL_NAMES[currentSchool];
  populateSubjects();
  renderPlans();
  renderWeeklyReport();
}

function populateSubjects() {
  const select = document.getElementById('subject-select');
  select.innerHTML = '';
  
  const subjects = SUBJECTS[currentSchool] || SUBJECTS.elem;
  subjects.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
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

// 계획 추가 및 시간 중복 검사
async function addPlan(e) {
  e.preventDefault();

  const date = document.getElementById('plan-date').value;
  const startTime = document.getElementById('start-time').value;
  const duration = parseInt(document.getElementById('duration').value);
  
  if (duration < 30) {
    alert('공부 시간은 최소 30분 이상이어야 합니다.');
    return;
  }

  let subject = document.getElementById('subject-select').value;
  if (subject === '기타') {
    subject = document.getElementById('custom-subject').value.trim();
    if (!subject) return;
  }

  const [startHour, startMin] = startTime.split(':').map(Number);
  const startMinutesTotal = startHour * 60 + startMin;
  const endMinutesTotal = startMinutesTotal + duration;

  const endHour = Math.floor(endMinutesTotal / 60) % 24;
  const endMin = endMinutesTotal % 60;
  const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

  // 시간 중복 검사
  const isOverlap = plans.some(plan => {
    if (plan.date !== date) return false;
    
    const [pStartH, pStartM] = plan.startTime.split(':').map(Number);
    const pStart = pStartH * 60 + pStartM;
    const [pEndH, pEndM] = plan.endTime.split(':').map(Number);
    const pEnd = pEndH * 60 + pEndM;

    return (startMinutesTotal < pEnd && endMinutesTotal > pStart);
  });

  if (isOverlap) {
    alert('이미 저장된 계획과 시간이 겹칩니다! 다른 시간을 선택해주세요.');
    return;
  }

  const newPlan = {
    id: Date.now(),
    date,
    startTime,
    endTime,
    subject,
    completed: false
  };

  plans.push(newPlan);
  savePlans();
  
  document.getElementById('start-time').value = '';
  document.getElementById('custom-subject').value = '';
  document.getElementById('view-date-picker').value = date;
  
  renderPlans();
}

function savePlans() {
  localStorage.setItem('study_plans', JSON.stringify(plans));
}

// 계획 목록 렌더링
function renderPlans() {
  const selectedDate = document.getElementById('view-date-picker').value;
  const listContainer = document.getElementById('plan-list');
  listContainer.innerHTML = '';

  const dayPlans = plans
    .filter(p => p.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (dayPlans.length === 0) {
    listContainer.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">등록된 계획이 없습니다.</p>';
    return;
  }

  const now = new Date();
  const currentDateStr = now.toISOString().split('T')[0];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  dayPlans.forEach(plan => {
    const item = document.createElement('div');
    
    const [endH, endM] = plan.endTime.split(':').map(Number);
    const planEndMinutes = endH * 60 + endM;

    const isTimeReached = (selectedDate < currentDateStr) || 
                          (selectedDate === currentDateStr && currentMinutes >= planEndMinutes);

    let statusClass = '';
    if (plan.completed) {
      statusClass = 'done';
    } else if (isTimeReached && !plan.completed) {
      statusClass = 'failed';
    }

    item.className = `plan-item ${statusClass}`;
    
    let buttonHTML = '';
    if (plan.completed) {
      buttonHTML = '<span style="color:var(--success-color); font-weight:bold;">✓ 달성 완료</span>';
    } else {
      const disabledAttr = isTimeReached ? '' : 'disabled style="opacity:0.5; cursor:not-allowed;"';
      const btnTitle = isTimeReached ? '' : 'title="종료 시간에 달성 버튼이 활성화됩니다"';
      buttonHTML = `<button class="btn btn-success btn-sm" onclick="completePlan(${plan.id})" ${disabledAttr} ${btnTitle}>달성</button>`;
    }

    item.innerHTML = `
      <div class="plan-info">
        <div class="time">🕒 ${plan.startTime} ~ ${plan.endTime}</div>
        <div class="subject">${plan.subject}</div>
      </div>
      <div>${buttonHTML}</div>
    `;

    listContainer.appendChild(item);
  });
}

function completePlan(id) {
  const plan = plans.find(p => p.id === id);
  if (plan) {
    plan.completed = true;
    savePlans();
    renderPlans();
    renderWeeklyReport();
  }
}

// 지난주 리포트 및 Chart.js 그래프
function renderWeeklyReport() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const distanceToLastMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + 7;
  
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - distanceToLastMonday);
  lastMonday.setHours(0, 0, 0, 0);

  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  const weekDays = ['월', '화', '수', '목', '금', '토', '일'];
  const dailyTotals = [0, 0, 0, 0, 0, 0, 0];
  const dailyCompleted = [0, 0, 0, 0, 0, 0, 0];

  let totalWeeklyCount = 0;
  let completedWeeklyCount = 0;

  plans.forEach(plan => {
    const planDate = new Date(plan.date + 'T00:00:00');
    if (planDate >= lastMonday && planDate <= lastSunday) {
      let dayIndex = planDate.getDay() - 1;
      if (dayIndex === -1) dayIndex = 6;

      dailyTotals[dayIndex]++;
      totalWeeklyCount++;

      if (plan.completed) {
        dailyCompleted[dayIndex]++;
        completedWeeklyCount++;
      }
    }
  });

  const dailyRates = dailyTotals.map((total, idx) => {
    return total > 0 ? Math.round((dailyCompleted[idx] / total) * 100) : 0;
  });

  const overallRate = totalWeeklyCount > 0 ? Math.round((completedWeeklyCount / totalWeeklyCount) * 100) : 0;

  document.getElementById('weekly-total').textContent = `${totalWeeklyCount}개`;
  document.getElementById('weekly-completed').textContent = `${completedWeeklyCount}개`;
  document.getElementById('weekly-rate').textContent = `${overallRate}%`;

  const ctx = document.getElementById('weeklyChart').getContext('2d');
  
  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: weekDays,
      datasets: [{
        label: '요일별 달성률 (%)',
        data: dailyRates,
        backgroundColor: 'rgba(74, 144, 226, 0.7)',
        borderColor: 'rgba(74, 144, 226, 1)',
        borderWidth: 1,
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { callback: value => value + '%' }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}