/**
 * 스터디 팜 (Study Farm) Logic
 */

// --- Global State ---
let userState = {
  grade: null,
  sp: 2000
};

let plans = [];
let seedInventory = {
  'seed_carrot': 3,
  'seed_sunflower': 1
};
let harvestedCrops = [];
let obtainedPets = {};
let equippedPets = [];

let currentDate = new Date();
let selectedDateStr = formatDate(new Date());

// --- Static Data ---
const SUBJECTS_BY_GRADE = {
  elementary: ['국어', '수학', '사회', '과학', '영어', '기타'],
  middle: ['국어', '수학', '사회', '역사', '과학', '영어', '기타'],
  high: ['국어', '수학', '영어', '한국사', '탐구(사/과)', '제2외국어', '기타']
};

const SEEDS_DATA = {
  'seed_carrot': { id: 'seed_carrot', name: '파릇파릇 당근 씨앗', icon: '🥕', rarity: 'Common', spBonus: 1.05 },
  'seed_sunflower': { id: 'seed_sunflower', name: '싱싱한 해바라기 씨앗', icon: '🌻', rarity: 'Rare', spBonus: 1.15 },
  'seed_clover': { id: 'seed_clover', name: '행운의 4잎 클로버 씨앗', icon: '🍀', rarity: 'Epic', spBonus: 1.30 },
  'seed_rose': { id: 'seed_rose', name: '무지개 장미 씨앗', icon: '🌹', rarity: 'Legendary', spBonus: 1.50 },
  'seed_tree': { id: 'seed_tree', name: '황금 스터디나무 씨앗', icon: '🌳', rarity: 'SSR', spBonus: 2.00 }
};

const PETS_DATA = {
  'pet_chick': { id: 'pet_chick', name: '느긋한 병아리', icon: '🐥', rarity: 'Common', bonusText: 'SP 보너스 +5%', spMultiplier: 0.05 },
  'pet_squirrel': { id: 'pet_squirrel', name: '부지런한 다람쥐', icon: '🐿️', rarity: 'Rare', bonusText: 'SP 보너스 +10%', spMultiplier: 0.10 },
  'pet_shiba': { id: 'pet_shiba', name: '공부하는 시바견', icon: '🐕', rarity: 'Epic', bonusText: 'SP 보너스 +20%', spMultiplier: 0.20 },
  'pet_panda': { id: 'pet_panda', name: '집중의 아기판다', icon: '🐼', rarity: 'Legendary', bonusText: 'SP 보너스 +35%', spMultiplier: 0.35 },
  'pet_owl': { id: 'pet_owl', name: '지혜의 올빼미', icon: '🦉', rarity: 'SSR', bonusText: 'SP 보너스 +50%', spMultiplier: 0.50 }
};

const SYNERGIES = [
  { id: 'syn_wisdom', name: '지혜와 집중', petReq: ['pet_owl', 'pet_panda'], desc: '추가 SP +25% 시너지', bonus: 0.25 },
  { id: 'syn_forest', name: '숲속 공부방', petReq: ['pet_squirrel', 'pet_owl'], desc: '추가 SP +15% 시너지', bonus: 0.15 },
  { id: 'syn_cute', name: '귀요미 동맹', petReq: ['pet_chick', 'pet_shiba'], desc: '추가 SP +10% 시너지', bonus: 0.10 }
];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  loadLocalStorage();
  initTabs();
  initCalendar();
  initEvents();
  renderApp();

  if (!userState.grade) {
    document.getElementById('schoolModal').classList.remove('hidden');
  }
});

// --- LocalStorage ---
function saveLocalStorage() {
  const data = { userState, plans, seedInventory, harvestedCrops, obtainedPets, equippedPets };
  localStorage.setItem('study_farm_data', JSON.stringify(data));
}

function loadLocalStorage() {
  const dataStr = localStorage.getItem('study_farm_data');
  if (dataStr) {
    try {
      const data = JSON.parse(dataStr);
      userState = data.userState || userState;
      plans = data.plans || [];
      seedInventory = data.seedInventory || seedInventory;
      harvestedCrops = data.harvestedCrops || [];
      obtainedPets = data.obtainedPets || {};
      equippedPets = data.equippedPets || [];
    } catch (e) {
      console.error(e);
    }
  }
}

// --- Navigation Tabs ---
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById(targetTab).classList.remove('hidden');

      if (targetTab === 'tab-report') renderWeeklyReport();
    });
  });
}

// --- Render Main ---
function renderApp() {
  const gradeLabels = { elementary: '초등학생 🎒', middle: '중학생 🏫', high: '고등학생 🎓' };
  document.getElementById('userGradeBadge').textContent = gradeLabels[userState.grade] || '학교 선택 필요';
  document.getElementById('userSp').textContent = userState.sp.toLocaleString();

  renderCalendar();
  renderPlanList();
  renderSeedInventory();
  renderHarvestedCrops();
  renderPetsAndSynergies();
  renderSidebarBuffs();

  saveLocalStorage();
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// --- Calendar ---
function initCalendar() {
  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
  document.getElementById('todayBtn').addEventListener('click', () => {
    currentDate = new Date();
    selectedDateStr = formatDate(currentDate);
    renderCalendar();
    renderPlanList();
  });
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  document.getElementById('calendarMonthYear').textContent = `${year}년 ${month + 1}월`;

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day-cell opacity-20 pointer-events-none';
    grid.appendChild(empty);
  }

  const todayStr = formatDate(new Date());

  for (let d = 1; d <= lastDate; d++) {
    const dateStr = formatDate(new Date(year, month, d));
    const cell = document.createElement('div');
    cell.className = `calendar-day-cell ${dateStr === todayStr ? 'today' : ''} ${dateStr === selectedDateStr ? 'selected' : ''}`;
    
    const dayPlans = plans.filter(p => p.date === dateStr);
    const dayCrops = dayPlans.filter(p => p.harvestedCrop).map(p => p.harvestedCrop.icon);

    cell.innerHTML = `
      <div class="flex justify-between items-center text-xs">
        <span class="font-bold">${d}</span>
        ${dayPlans.length > 0 ? `<span class="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">${dayPlans.length}건</span>` : ''}
      </div>
      <div class="flex flex-wrap gap-0.5 text-xs mt-1">
        ${dayCrops.join('')}
      </div>
    `;

    cell.addEventListener('click', () => {
      selectedDateStr = dateStr;
      renderCalendar();
      renderPlanList();
    });

    grid.appendChild(cell);
  }
}

// --- Plan List & Interactive Actions ---
function renderPlanList() {
  document.getElementById('selectedDateTitle').textContent = `${selectedDateStr} 공부 계획`;
  const container = document.getElementById('planList');
  container.innerHTML = '';

  const dayPlans = plans.filter(p => p.date === selectedDateStr);

  if (dayPlans.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <p class="text-sm font-semibold">등록된 공부 계획이 없습니다. 상단의 [+ 계획 추가하기] 버튼을 누르세요!</p>
      </div>
    `;
    return;
  }

  const now = new Date();
  const nowStr = formatDate(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  dayPlans.forEach(plan => {
    const seedInfo = SEEDS_DATA[plan.seedId] || SEEDS_DATA['seed_carrot'];
    const [sH, sM] = plan.startTime.split(':').map(Number);
    const [eH, eM] = plan.endTime.split(':').map(Number);
    const totalMin = (eH * 60 + eM) - (sH * 60 + sM);

    const isToday = (plan.date === nowStr);
    const isTimeWindow = isToday && (currentMinutes >= (sH*60+sM) && currentMinutes <= (eH*60+eM));

    const stages = { 0: '🌱 씨앗', 25: '🌿 새싹', 50: '🪵 줄기', 75: '🌸 꽃', 100: seedInfo.icon + ' 완숙' };
    const currentStageName = stages[plan.waterStage || 0];

    const card = document.createElement('div');
    card.className = `plant-card bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 ${plan.status === 'completed' ? 'bg-emerald-50/60 border-emerald-300' : ''}`;

    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex items-center gap-3">
          <div class="text-3xl p-2.5 bg-white rounded-2xl shadow-sm border border-slate-100">
            ${plan.status === 'completed' ? plan.harvestedCrop?.icon || seedInfo.icon : seedInfo.icon}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">${plan.subject}</span>
              <span class="text-xs text-slate-500 font-semibold"><i class="fa-regular fa-clock mr-1"></i>${plan.startTime} ~ ${plan.endTime} (${totalMin}분)</span>
            </div>
            <h4 class="font-bold text-slate-800 mt-1">${plan.title}</h4>
          </div>
        </div>
        <button onclick="deletePlan('${plan.id}')" class="text-slate-300 hover:text-red-500 text-sm p-1.5 cursor-pointer">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>

      <!-- Growth Progress -->
      <div class="space-y-1">
        <div class="flex justify-between text-xs text-slate-600 font-bold">
          <span>단계: <strong class="text-emerald-600">${currentStageName}</strong></span>
          <span>물주기: ${plan.waterStage || 0}%</span>
        </div>
        <div class="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div class="bg-emerald-500 h-3 rounded-full transition-all duration-300" style="width: ${plan.waterStage || 0}%"></div>
        </div>
      </div>

      ${plan.metPets && plan.metPets.length > 0 ? `
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-2 text-xs flex items-center gap-2 text-amber-800 font-bold">
          <span>🐾 방문 펫:</span> ${plan.metPets.map(p => `${p.icon} ${p.name}`).join(', ')}
        </div>
      ` : ''}

      <!-- Action Buttons -->
      <div class="flex items-center justify-between pt-2 border-t border-slate-200">
        <span class="text-xs text-slate-400">
          ${!isTimeWindow && plan.status === 'planned' ? '🔒 정해진 공부 시간에 물주기 가능' : '✨ 물주기 가능'}
        </span>
        <div class="flex gap-2">
          ${plan.status === 'planned' ? `
            <button onclick="waterPlan('${plan.id}')" ${!isTimeWindow ? 'disabled' : ''} class="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer flex items-center gap-1">
              <i class="fa-solid fa-droplet"></i> 물주기 (+25%)
            </button>
            <button onclick="completePlan('${plan.id}')" class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer flex items-center gap-1">
              <i class="fa-solid fa-check"></i> 달성 완료 및 수확
            </button>
          ` : `
            <span class="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300">
              <i class="fa-solid fa-circle-check mr-1"></i> 수확 및 달성 완료
            </span>
          `}
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

window.waterPlan = function(planId) {
  const plan = plans.find(p => p.id === planId);
  if (!plan || plan.status === 'completed') return;

  let stage = plan.waterStage || 0;
  if (stage >= 100) {
    alert('이미 물을 완전히 주었습니다! 달성 완료 버튼을 눌러 수확하세요.');
    return;
  }

  stage += 25;
  plan.waterStage = stage;

  if (stage === 50 || stage === 100) {
    triggerPetEncounter(plan);
  }

  renderApp();
};

window.completePlan = function(planId) {
  const plan = plans.find(p => p.id === planId);
  if (!plan || plan.status === 'completed') return;

  const [sH, sM] = plan.startTime.split(':').map(Number);
  const [eH, eM] = plan.endTime.split(':').map(Number);
  const minutes = (eH * 60 + eM) - (sH * 60 + sM);

  let earnedSp = minutes * 15;
  const seedInfo = SEEDS_DATA[plan.seedId] || SEEDS_DATA['seed_carrot'];
  earnedSp = Math.round(earnedSp * seedInfo.spBonus);

  const petBuff = getActivePetBuffBonus();
  earnedSp = Math.round(earnedSp * (1 + petBuff));

  plan.status = 'completed';
  plan.waterStage = 100;
  plan.harvestedCrop = {
    name: seedInfo.name.replace(' 씨앗', ''),
    icon: seedInfo.icon,
    rarity: seedInfo.rarity,
    date: plan.date
  };

  harvestedCrops.push(plan.harvestedCrop);
  userState.sp += earnedSp;

  alert(`🎉 공부 달성 완료!\n${minutes}분 공부 보상으로 ${earnedSp} SP를 획득하고 ${plan.harvestedCrop.name}을(를) 수확했습니다!`);
  renderApp();
};

window.deletePlan = function(planId) {
  if (confirm('계획을 삭제하시겠습니까?')) {
    plans = plans.filter(p => p.id !== planId);
    renderApp();
  }
};

function triggerPetEncounter(plan) {
  const rand = Math.random();
  let petId = 'pet_chick';

  if (rand < 0.05) petId = 'pet_owl';
  else if (rand < 0.15) petId = 'pet_panda';
  else if (rand < 0.35) petId = 'pet_shiba';
  else if (rand < 0.65) petId = 'pet_squirrel';

  const pet = PETS_DATA[petId];
  obtainedPets[petId] = (obtainedPets[petId] || 0) + 1;

  if (!plan.metPets) plan.metPets = [];
  plan.metPets.push(pet);

  alert(`🐾 꼬마 손님이 찾아왔습니다!\n[${pet.rarity}] ${pet.icon} ${pet.name}이(가) 등장했습니다!`);
}

// --- Event Handlers & Modals ---
function initEvents() {
  document.querySelectorAll('.grade-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      userState.grade = btn.dataset.grade;
      document.getElementById('schoolModal').classList.add('hidden');
      updateSubjectOptions();
      renderApp();
    });
  });

  document.getElementById('openSchoolModalBtn').addEventListener('click', () => {
    document.getElementById('schoolModal').classList.remove('hidden');
  });

  document.getElementById('openPlanModalBtn').addEventListener('click', () => {
    document.getElementById('planDate').value = selectedDateStr;
    updateSubjectOptions();
    updateSeedSelectOptions();
    document.getElementById('planModal').classList.remove('hidden');
  });

  document.getElementById('closePlanModalBtn').addEventListener('click', () => {
    document.getElementById('planModal').classList.add('hidden');
  });

  document.getElementById('planSubject').addEventListener('change', (e) => {
    const container = document.getElementById('customSubjectContainer');
    if (e.target.value === '기타') container.classList.remove('hidden');
    else container.classList.add('hidden');
  });

  document.getElementById('planForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const date = document.getElementById('planDate').value;
    const startTime = document.getElementById('planStartTime').value;
    const endTime = document.getElementById('planEndTime').value;
    let subject = document.getElementById('planSubject').value;
    if (subject === '기타') {
      subject = document.getElementById('customSubjectInput').value.trim() || '기타';
    }
    const title = document.getElementById('planTitle').value.trim();
    const seedId = document.getElementById('planSeedSelect').value;

    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const duration = (eH * 60 + eM) - (sH * 60 + sM);

    if (duration < 30) {
      alert('공부 시간은 최소 30분 이상이어야 합니다.');
      return;
    }

    const hasOverlap = plans.some(p => {
      if (p.date !== date) return false;
      const [psH, psM] = p.startTime.split(':').map(Number);
      const [peH, peM] = p.endTime.split(':').map(Number);
      return ((sH * 60 + sM) < (peH * 60 + peM) && (eH * 60 + eM) > (psH * 60 + psM));
    });

    if (hasOverlap) {
      alert('선택한 시간에 이미 공부 계획이 존재합니다!');
      return;
    }

    if (seedInventory[seedId] && seedInventory[seedId] > 0) {
      seedInventory[seedId]--;
      if (seedInventory[seedId] === 0) delete seedInventory[seedId];
    } else {
      alert('씨앗을 먼저 선택해주세요.');
      return;
    }

    plans.push({
      id: 'plan_' + Date.now(),
      date,
      startTime,
      endTime,
      subject,
      title,
      seedId,
      waterStage: 0,
      status: 'planned',
      metPets: []
    });

    document.getElementById('planModal').classList.add('hidden');
    document.getElementById('planForm').reset();
    renderApp();
  });

  document.getElementById('gacha1Btn').addEventListener('click', () => performGacha(1));
  document.getElementById('gacha10Btn').addEventListener('click', () => performGacha(10));
  document.getElementById('closeGachaModalBtn').addEventListener('click', () => {
    document.getElementById('gachaResultModal').classList.add('hidden');
  });
}

function updateSubjectOptions() {
  const select = document.getElementById('planSubject');
  select.innerHTML = '';
  const list = SUBJECTS_BY_GRADE[userState.grade || 'elementary'];
  list.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
    select.appendChild(opt);
  });
}

function updateSeedSelectOptions() {
  const select = document.getElementById('planSeedSelect');
  select.innerHTML = '';
  Object.keys(seedInventory).forEach(seedId => {
    const seed = SEEDS_DATA[seedId];
    if (seed) {
      const opt = document.createElement('option');
      opt.value = seedId;
      opt.textContent = `${seed.icon} ${seed.name} (${seedInventory[seedId]}개 보유)`;
      select.appendChild(opt);
    }
  });
}

// --- Gacha ---
function performGacha(count) {
  const cost = count * 100;
  if (userState.sp < cost) {
    alert(`SP가 부족합니다. (필요: ${cost} SP)`);
    return;
  }

  userState.sp -= cost;
  const results = [];

  for (let i = 0; i < count; i++) {
    const rand = Math.random();
    let drawnId = 'seed_carrot';

    if (rand < 0.005) drawnId = 'seed_tree';
    else if (rand < 0.035) drawnId = 'seed_rose';
    else if (rand < 0.15) drawnId = 'seed_clover';
    else if (rand < 0.50) drawnId = 'seed_sunflower';

    seedInventory[drawnId] = (seedInventory[drawnId] || 0) + 1;
    results.push(SEEDS_DATA[drawnId]);
  }

  const listContainer = document.getElementById('gachaResultList');
  listContainer.innerHTML = '';
  results.forEach(res => {
    const item = document.createElement('div');
    item.className = `p-3 rounded-xl flex flex-col items-center justify-center bg-rarity-${res.rarity.toLowerCase()}`;
    item.innerHTML = `
      <span class="text-3xl mb-1">${res.icon}</span>
      <span class="text-xs font-bold">${res.name}</span>
      <span class="text-[10px] opacity-75">${res.rarity}</span>
    `;
    listContainer.appendChild(item);
  });

  document.getElementById('gachaResultModal').classList.remove('hidden');
  renderApp();
}

// --- Inventory & Pets UI ---
function renderSeedInventory() {
  const grid = document.getElementById('seedInventoryGrid');
  grid.innerHTML = '';

  const keys = Object.keys(seedInventory);
  if (keys.length === 0) {
    grid.innerHTML = '<p class="text-xs text-slate-400 col-span-full">보유한 씨앗이 없습니다. 씨앗 뽑기 탭을 이용해보세요!</p>';
    return;
  }

  keys.forEach(k => {
    const seed = SEEDS_DATA[k];
    const card = document.createElement('div');
    card.className = `p-3 rounded-2xl text-center bg-rarity-${seed.rarity.toLowerCase()}`;
    card.innerHTML = `
      <div class="text-3xl mb-1">${seed.icon}</div>
      <div class="text-xs font-bold">${seed.name}</div>
      <div class="text-[10px] opacity-80 mb-1">SP 보너스 ×${seed.spBonus}</div>
      <div class="text-xs font-black bg-white/80 rounded-full py-0.5 px-2 inline-block shadow-sm">보유: ${seedInventory[k]}개</div>
    `;
    grid.appendChild(card);
  });
}

function renderHarvestedCrops() {
  const grid = document.getElementById('harvestedCropGrid');
  grid.innerHTML = '';

  if (harvestedCrops.length === 0) {
    grid.innerHTML = '<p class="text-xs text-slate-400 col-span-full">수확한 작물이 없습니다.</p>';
    return;
  }

  harvestedCrops.forEach(crop => {
    const card = document.createElement('div');
    card.className = `p-3 rounded-2xl text-center bg-emerald-50 border border-emerald-200`;
    card.innerHTML = `
      <div class="text-3xl mb-1">${crop.icon}</div>
      <div class="text-xs font-bold text-slate-800">${crop.name}</div>
      <div class="text-[10px] text-slate-400">${crop.date} 수확</div>
    `;
    grid.appendChild(card);
  });
}

function renderPetsAndSynergies() {
  const equipGrid = document.getElementById('equippedPetsGrid');
  equipGrid.innerHTML = '';

  for (let i = 0; i < 2; i++) {
    const petId = equippedPets[i];
    const pet = PETS_DATA[petId];

    const slot = document.createElement('div');
    if (pet) {
      slot.className = `p-3 rounded-2xl border-2 border-emerald-400 bg-emerald-50 flex items-center justify-between shadow-sm`;
      slot.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="text-3xl">${pet.icon}</span>
          <div>
            <div class="text-xs font-bold text-slate-800">${pet.name}</div>
            <div class="text-[10px] text-emerald-600 font-bold">${pet.bonusText}</div>
          </div>
        </div>
        <button onclick="unequipPet(${i})" class="text-xs text-red-500 font-bold px-2 py-1 bg-white rounded-lg border border-slate-200 shadow-sm cursor-pointer">해제</button>
      `;
    } else {
      slot.className = `p-3 rounded-2xl border-2 border-dashed border-slate-200 flex items-center gap-2 bg-slate-50/50`;
      slot.innerHTML = `
        <span class="text-xl text-slate-300"><i class="fa-solid fa-plus"></i></span>
        <span class="text-xs text-slate-400 font-bold">슬롯 ${i + 1} 미장착</span>
      `;
    }
    equipGrid.appendChild(slot);
  }

  const synList = document.getElementById('activeSynergiesList');
  synList.innerHTML = '';

  SYNERGIES.forEach(syn => {
    const isActive = syn.petReq.every(r => equippedPets.includes(r));
    const card = document.createElement('div');
    card.className = `p-3 rounded-xl border flex justify-between items-center ${isActive ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200 opacity-50'}`;
    card.innerHTML = `
      <div>
        <div class="text-xs font-bold flex items-center gap-2">
          <span>${syn.name}</span>
          ${isActive ? '<span class="bg-amber-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">활성화</span>' : ''}
        </div>
        <div class="text-[10px] text-slate-500">${syn.desc}</div>
      </div>
    `;
    synList.appendChild(card);
  });

  const codexGrid = document.getElementById('petCodexGrid');
  codexGrid.innerHTML = '';

  Object.keys(PETS_DATA).forEach(id => {
    const pet = PETS_DATA[id];
    const count = obtainedPets[id] || 0;
    const isEquipped = equippedPets.includes(id);

    const card = document.createElement('div');
    card.className = `p-3 rounded-2xl border text-center ${count > 0 ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-100 opacity-40'}`;
    card.innerHTML = `
      <div class="text-3xl mb-1">${count > 0 ? pet.icon : '❓'}</div>
      <div class="text-xs font-bold text-slate-800">${pet.name}</div>
      <div class="text-[10px] text-slate-500 mb-2">${pet.bonusText}</div>
      ${count > 0 ? `
        <button onclick="equipPet('${id}')" class="text-[10px] px-2.5 py-1 rounded-lg font-bold cursor-pointer ${isEquipped ? 'bg-emerald-600 text-white' : 'bg-slate-200 hover:bg-emerald-100 text-slate-700'}">
          ${isEquipped ? '장착 됨' : '장착하기'}
        </button>
      ` : '<span class="text-[10px] text-slate-400">미발견</span>'}
    `;
    codexGrid.appendChild(card);
  });
}

window.equipPet = function(petId) {
  if (equippedPets.includes(petId)) return;
  if (equippedPets.length >= 2) equippedPets.shift();
  equippedPets.push(petId);
  renderApp();
};

window.unequipPet = function(index) {
  equippedPets.splice(index, 1);
  renderApp();
};

function getActivePetBuffBonus() {
  let total = 0;
  equippedPets.forEach(id => {
    if (PETS_DATA[id]) total += PETS_DATA[id].spMultiplier;
  });
  SYNERGIES.forEach(syn => {
    if (syn.petReq.every(r => equippedPets.includes(r))) total += syn.bonus;
  });
  return total;
}

function renderSidebarBuffs() {
  const buffContainer = document.getElementById('sidebarBuffList');
  const total = getActivePetBuffBonus();
  document.getElementById('totalBuffValue').textContent = `+${Math.round(total * 100)}% SP`;

  if (equippedPets.length === 0) {
    buffContainer.innerHTML = '<p class="text-slate-400 italic">장착된 펫이 없습니다.</p>';
    return;
  }

  let html = '';
  equippedPets.forEach(id => {
    const pet = PETS_DATA[id];
    html += `<div class="flex justify-between"><span>${pet.icon} ${pet.name}</span><span class="font-bold text-emerald-600">${pet.bonusText}</span></div>`;
  });
  buffContainer.innerHTML = html;
}

let weeklyChartInstance = null;
function renderWeeklyReport() {
  const ctx = document.getElementById('weeklyChart').getContext('2d');
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  const completionData = [80, 100, 60, 90, 100, 75, 85];

  document.getElementById('weeklyAvgRate').textContent = '84%';

  if (weeklyChartInstance) weeklyChartInstance.destroy();

  weeklyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: '지난주 달성률 (%)',
        data: completionData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, max: 100 } }
    }
  });
}
