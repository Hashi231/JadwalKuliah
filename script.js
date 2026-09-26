const STORAGE_KEYS = {
  schedule: 'studyflow-schedule',
  todos: 'studyflow-todos',
  users: 'studyflow-users',
  currentUser: 'studyflow-current-user',
};

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const initialSchedule = {
  Senin: [
    { id: crypto.randomUUID(), time: '09:00', subject: 'Kalkulus I', type: 'Kuliah', room: 'A-201' },
    { id: crypto.randomUUID(), time: '11:30', subject: 'Praktikum Fisika', type: 'Praktikum', room: 'Lab 2' },
    { id: crypto.randomUUID(), time: '14:00', subject: 'Sejarah', type: 'Seminar', room: 'B-104' },
  ],
  Selasa: [
    { id: crypto.randomUUID(), time: '10:00', subject: 'Ilmu Komputer', type: 'Kuliah', room: 'C-312' },
    { id: crypto.randomUUID(), time: '13:30', subject: 'Bahasa Inggris', type: 'Workshop', room: 'D-110' },
  ],
  Rabu: [
    { id: crypto.randomUUID(), time: '08:30', subject: 'Biologi', type: 'Kuliah', room: 'A-118' },
    { id: crypto.randomUUID(), time: '12:00', subject: 'Studio Desain', type: 'Studio', room: 'F-205' },
  ],
  Kamis: [
    { id: crypto.randomUUID(), time: '09:30', subject: 'Statistika', type: 'Tutorial', room: 'E-11' },
    { id: crypto.randomUUID(), time: '15:00', subject: 'Rapat Proyek', type: 'Tim', room: 'Zoom' },
  ],
  Jumat: [
    { id: crypto.randomUUID(), time: '10:30', subject: 'Kimia', type: 'Kuliah', room: 'B-202' },
    { id: crypto.randomUUID(), time: '14:00', subject: 'Sesi Belajar', type: 'Review', room: 'Perpustakaan' },
  ],
  Sabtu: [
    { id: crypto.randomUUID(), time: '09:00', subject: 'Review Materi', type: 'Review', room: 'Perpustakaan' },
  ],
};

function createDefaultTodos() {
  return [
    { id: crypto.randomUUID(), title: 'Selesaikan laporan praktikum kimia', subject: 'Kimia', priority: 'High', dueDate: addDays(new Date(), 1).toISOString().slice(0, 10), done: false },
    { id: crypto.randomUUID(), title: 'Baca bab 5 sejarah', subject: 'Sejarah', priority: 'Medium', dueDate: addDays(new Date(), 2).toISOString().slice(0, 10), done: false },
    { id: crypto.randomUUID(), title: 'Kumpulkan tugas rumah statistika', subject: 'Statistika', priority: 'High', dueDate: addDays(new Date(), 4).toISOString().slice(0, 10), done: true },
  ];
}

const scheduleGrid = document.getElementById('scheduleGrid');
const todoList = document.getElementById('todoList');
const todoForm = document.getElementById('todoForm');
const filterButtons = document.querySelectorAll('.filter-btn');
const todayDate = document.getElementById('todayDate');
const todayTime = document.getElementById('todayTime');
const courseCount = document.getElementById('courseCount');
const dueSoonCount = document.getElementById('dueSoonCount');
const completedCount = document.getElementById('completedCount');
const scheduleModal = document.getElementById('scheduleModal');
const scheduleForm = document.getElementById('scheduleForm');
const scheduleModalTitle = document.getElementById('scheduleModalTitle');
const authScreen = document.getElementById('authScreen');
const appShell = document.getElementById('appShell');
const welcomeText = document.getElementById('welcomeText');
const universityTitle = document.getElementById('universityTitle');
const logoutBtn = document.getElementById('logoutBtn');
const authMessage = document.getElementById('authMessage');
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

let activeFilter = 'all';
let editingScheduleId = null;

function addDays(date, days) {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
}

function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function normalizeCredential(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('studyflow-token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload ? payload.message || 'Permintaan gagal.' : 'Permintaan gagal.';
    throw new Error(message);
  }

  return payload;
}

function normalizeSchedule(schedule) {
  const normalized = {};

  DAYS.forEach((day) => {
    normalized[day] = [];
  });

  Object.entries(schedule || {}).forEach(([day, classes]) => {
    const normalizedDay = DAYS.find((item) => item.toLowerCase() === String(day).toLowerCase()) || day;
    if (!normalized[normalizedDay]) {
      normalized[normalizedDay] = [];
    }

    normalized[normalizedDay] = (Array.isArray(classes) ? classes : [])
      .map((item) => ({
        id: item.id || crypto.randomUUID(),
        time: item.time || '09:00',
        subject: String(item.subject || '').trim(),
        type: String(item.type || 'Kuliah').trim(),
        room: String(item.room || '').trim(),
      }))
      .filter((item) => item.subject && item.room);
  });

  return normalized;
}

function normalizeTodos(tasks) {
  return (Array.isArray(tasks) ? tasks : []).map((task) => ({
    ...task,
    id: task.id || crypto.randomUUID(),
    title: String(task.title || '').trim(),
    subject: String(task.subject || '').trim(),
    priority: String(task.priority || 'Medium').trim(),
    dueDate: String(task.dueDate || new Date().toISOString().slice(0, 10)),
    done: Boolean(task.done),
  }));
}

function ensureInitialData() {
  if (!localStorage.getItem(STORAGE_KEYS.schedule)) {
    saveData(STORAGE_KEYS.schedule, initialSchedule);
  }

  if (!localStorage.getItem(STORAGE_KEYS.todos)) {
    saveData(STORAGE_KEYS.todos, createDefaultTodos());
  }
}

function getSchedule() {
  const schedule = loadData(STORAGE_KEYS.schedule, initialSchedule);
  const normalized = normalizeSchedule(schedule);

  if (JSON.stringify(normalized) !== JSON.stringify(schedule)) {
    saveData(STORAGE_KEYS.schedule, normalized);
  }

  return normalized;
}

function getTodos() {
  const tasks = loadData(STORAGE_KEYS.todos, createDefaultTodos());
  const normalized = normalizeTodos(tasks);

  if (JSON.stringify(normalized) !== JSON.stringify(tasks)) {
    saveData(STORAGE_KEYS.todos, normalized);
  }

  return normalized;
}

function updateOverview() {
  const tasks = getTodos();
  const completed = tasks.filter((task) => task.done).length;
  const dueSoon = tasks.filter((task) => !task.done && dueWithinDays(task.dueDate, 3)).length;
  const totalClasses = Object.values(getSchedule()).reduce((total, dayClasses) => total + dayClasses.length, 0);

  courseCount.textContent = totalClasses;
  dueSoonCount.textContent = dueSoon;
  completedCount.textContent = completed;
}

function dueWithinDays(dateString, days) {
  const dueDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const difference = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  return difference >= 0 && difference <= days;
}

function renderSchedule() {
  const schedule = getSchedule();

  scheduleGrid.innerHTML = DAYS.map((day) => {
    const items = [...(schedule[day] || [])].sort((a, b) => a.time.localeCompare(b.time));
    const classMarkup = items.length
      ? items
          .map(
            (item) => `
              <article class="class-card">
                <div class="class-head">
                  <span class="time">${item.time}</span>
                  <span class="tag">${item.type}</span>
                </div>
                <h3 class="course-name">${item.subject}</h3>
                <p class="room">${item.room}</p>
                <div class="class-actions">
                  <button type="button" class="small-action" data-action="edit" data-day="${day}" data-id="${item.id}">Edit</button>
                  <button type="button" class="small-action danger" data-action="delete" data-day="${day}" data-id="${item.id}">Hapus</button>
                </div>
              </article>
            `,
          )
          .join('')
      : '<p class="empty-state">Tidak ada kelas</p>';

    return `
      <div class="day-column">
        <div class="day-header">
          <h3>${day}</h3>
          <button type="button" class="mini-btn add-day-class" data-day="${day}" aria-label="Tambah kelas ${day}">+</button>
        </div>
        <div class="class-list">${classMarkup}</div>
      </div>
    `;
  }).join('');
}

function renderTodos() {
  let tasks = getTodos();

  if (activeFilter === 'pending') {
    tasks = tasks.filter((task) => !task.done);
  }

  if (activeFilter === 'done') {
    tasks = tasks.filter((task) => task.done);
  }

  tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  if (!tasks.length) {
    todoList.innerHTML = '<li class="empty-state">Tidak ada tugas dalam tampilan ini.</li>';
    return;
  }

  todoList.innerHTML = tasks
    .map(
      (task) => `
        <li class="todo-item ${task.done ? 'done' : ''}">
          <div class="todo-main">
            <input type="checkbox" data-id="${task.id}" ${task.done ? 'checked' : ''} aria-label="Tandai ${task.title} sebagai selesai" />
            <div class="todo-copy">
              <h3>${task.title}</h3>
              <div class="task-meta">
                <span>${task.subject}</span>
                <span class="priority-badge ${String(task.priority).toLowerCase()}">${translatePriority(task.priority)}</span>
                <span>${formatDate(task.dueDate)}</span>
              </div>
            </div>
          </div>
          <button class="delete-btn" type="button" data-delete-id="${task.id}" aria-label="Hapus ${task.title}">×</button>
        </li>
      `,
    )
    .join('');
}

function translatePriority(priority) {
  const map = {
    High: 'Tinggi',
    Medium: 'Sedang',
    Low: 'Rendah',
  };

  return map[priority] || priority;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
}

function openScheduleModal({ day = 'Senin', item = null } = {}) {
  scheduleModal.classList.remove('hidden');
  scheduleModal.setAttribute('aria-hidden', 'false');

  const dayField = document.getElementById('scheduleDay');
  const timeField = document.getElementById('scheduleTime');
  const subjectField = document.getElementById('scheduleSubject');
  const typeField = document.getElementById('scheduleType');
  const roomField = document.getElementById('scheduleRoom');

  if (item) {
    editingScheduleId = item.id;
    scheduleModalTitle.textContent = 'Edit kelas';
    dayField.value = day;
    timeField.value = item.time;
    subjectField.value = item.subject;
    typeField.value = item.type;
    roomField.value = item.room;
  } else {
    editingScheduleId = null;
    scheduleModalTitle.textContent = 'Tambah kelas';
    scheduleForm.reset();
    dayField.value = day;
    timeField.value = '09:00';
    typeField.value = 'Kuliah';
  }
}

function closeScheduleModal() {
  scheduleModal.classList.add('hidden');
  scheduleModal.setAttribute('aria-hidden', 'true');
  scheduleForm.reset();
}

function handleScheduleSubmit(event) {
  event.preventDefault();

  const schedule = getSchedule();
  const nextDay = document.getElementById('scheduleDay').value;
  const payload = {
    id: editingScheduleId || crypto.randomUUID(),
    time: document.getElementById('scheduleTime').value,
    subject: document.getElementById('scheduleSubject').value.trim(),
    type: document.getElementById('scheduleType').value,
    room: document.getElementById('scheduleRoom').value.trim(),
  };

  if (!payload.subject || !payload.room || !payload.time) {
    return;
  }

  if (editingScheduleId) {
    const nextSchedule = {};
    DAYS.forEach((day) => {
      const list = (schedule[day] || []).filter((item) => item.id !== editingScheduleId);
      nextSchedule[day] = list;
    });

    if (!nextSchedule[nextDay]) {
      nextSchedule[nextDay] = [];
    }

    nextSchedule[nextDay].push(payload);
    saveData(STORAGE_KEYS.schedule, nextSchedule);
  } else {
    const nextSchedule = {
      ...schedule,
      [nextDay]: [...(schedule[nextDay] || []), payload],
    };
    saveData(STORAGE_KEYS.schedule, nextSchedule);
  }

  closeScheduleModal();
  renderSchedule();
  updateOverview();
}

function handleScheduleClick(event) {
  const addButton = event.target.closest('.add-day-class');
  if (addButton) {
    openScheduleModal({ day: addButton.dataset.day });
    return;
  }

  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;

  const { action, day, id } = actionButton.dataset;
  const schedule = getSchedule();

  if (action === 'delete') {
    const nextSchedule = {
      ...schedule,
      [day]: (schedule[day] || []).filter((item) => item.id !== id),
    };
    saveData(STORAGE_KEYS.schedule, nextSchedule);
    renderSchedule();
    updateOverview();
    return;
  }

  if (action === 'edit') {
    const item = (schedule[day] || []).find((course) => course.id === id);
    if (item) {
      openScheduleModal({ day, item });
    }
  }
}

function handleAddTask(event) {
  event.preventDefault();

  const title = document.getElementById('taskTitle').value.trim();
  const subject = document.getElementById('taskSubject').value.trim();
  const priority = document.getElementById('taskPriority').value;
  const dueDate = document.getElementById('taskDueDate').value;

  if (!title || !subject || !dueDate) return;

  const tasks = getTodos();
  tasks.unshift({
    id: crypto.randomUUID(),
    title,
    subject,
    priority,
    dueDate,
    done: false,
  });

  saveData(STORAGE_KEYS.todos, tasks);
  todoForm.reset();
  document.getElementById('taskPriority').value = 'Medium';
  document.getElementById('taskDueDate').value = new Date().toISOString().slice(0, 10);
  renderTodos();
  updateOverview();
}

function handleTodoInteraction(event) {
  const target = event.target;

  if (target.matches('input[type="checkbox"]')) {
    const tasks = getTodos();
    const task = tasks.find((item) => item.id === target.dataset.id);
    if (!task) return;

    task.done = target.checked;
    saveData(STORAGE_KEYS.todos, tasks);
    renderTodos();
    updateOverview();
  }

  if (target.matches('.delete-btn')) {
    const id = target.dataset.deleteId;
    const tasks = getTodos().filter((task) => task.id !== id);
    saveData(STORAGE_KEYS.todos, tasks);
    renderTodos();
    updateOverview();
  }
}

function bindFilters() {
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      filterButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
      renderTodos();
    });
  });
}

function updateTodayDate() {
  const now = new Date();
  const dateText = now.toLocaleDateString('id-ID', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeText = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  if (todayDate) {
    todayDate.textContent = dateText;
  }

  if (todayTime) {
    todayTime.textContent = timeText;
  }
}

function getUsers() {
  const users = loadData(STORAGE_KEYS.users, []);
  return Array.isArray(users) ? users : [];
}

function saveUsers(users) {
  return saveData(STORAGE_KEYS.users, users);
}

function setAuthMessage(message, isSuccess = false) {
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.classList.toggle('success', isSuccess);
}

function switchAuthMode(mode) {
  authTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.authMode === mode));
  authForms.forEach((form) => form.classList.toggle('active', form.id === `${mode}Form`));
  setAuthMessage('');
}

function handleAuthTabClick(event) {
  const tab = event.target.closest('.auth-tab');
  if (!tab) return;
  switchAuthMode(tab.dataset.authMode);
}

async function handleRegister(event) {
  event.preventDefault();

  const username = normalizeCredential(document.getElementById('registerUsername').value);
  const fullName = normalizeCredential(document.getElementById('registerFullName').value);
  const university = normalizeCredential(document.getElementById('registerUniversity').value);
  const nim = normalizeCredential(document.getElementById('registerNim').value);

  if (!username || !fullName || !university || !nim) {
    setAuthMessage('Semua field harus diisi, termasuk universitas.');
    return;
  }

  try {
    const response = await apiRequest('/api/register', {
      method: 'POST',
      body: JSON.stringify({ username, fullName, university, password: nim }),
    });

    setAuthMessage('Registrasi berhasil, silakan login.', true);
    registerForm.reset();
    switchAuthMode('login');
    if (response && response.user) {
      localStorage.setItem('studyflow-last-user', response.user.username || username);
    }
  } catch (error) {
    setAuthMessage(error.message || 'Registrasi gagal. Coba lagi.');
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const username = normalizeCredential(document.getElementById('loginUsername').value);
  const password = normalizeCredential(document.getElementById('loginPassword').value);

  if (!username || !password) {
    setAuthMessage('Username dan password harus diisi.');
    return;
  }

  try {
    const response = await apiRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    const nextUser = {
      username: response.user.username,
      fullName: response.user.fullName,
      university: response.user.university || 'Universitas Islam Negeri Jakarta',
    };

    localStorage.setItem('studyflow-token', response.token);
    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(nextUser));
    localStorage.setItem('studyflow-last-user', nextUser.username);

    authScreen.classList.add('hidden');
    appShell.classList.remove('hidden');
    welcomeText.textContent = `Halo, ${nextUser.fullName}!`;
    if (universityTitle) {
      universityTitle.textContent = nextUser.university;
    }
    loginForm.reset();
    setAuthMessage('');
  } catch (error) {
    setAuthMessage(error.message || 'Username atau password salah.');
  }
}

function handleLogout() {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  localStorage.removeItem('studyflow-token');
  localStorage.removeItem('studyflow-last-user');
  authScreen.classList.remove('hidden');
  appShell.classList.add('hidden');
  loginForm.reset();
  registerForm.reset();
  setAuthMessage('');
  switchAuthMode('login');
}

async function restoreSession() {
  const currentUser = loadData(STORAGE_KEYS.currentUser, null);
  const token = localStorage.getItem('studyflow-token');

  if (!token) {
    if (!currentUser) {
      appShell.classList.add('hidden');
      authScreen.classList.remove('hidden');
      return;
    }

    appShell.classList.remove('hidden');
    authScreen.classList.add('hidden');
    welcomeText.textContent = `Halo, ${currentUser.fullName}!`;
    if (universityTitle) {
      universityTitle.textContent = currentUser.university || 'Universitas Islam Negeri Jakarta';
    }
    return;
  }

  try {
    const response = await apiRequest('/api/me');
    const nextUser = {
      username: response.user.username,
      fullName: response.user.fullName,
      university: response.user.university || 'Universitas Islam Negeri Jakarta',
    };

    saveData(STORAGE_KEYS.currentUser, nextUser);
    authScreen.classList.add('hidden');
    appShell.classList.remove('hidden');
    welcomeText.textContent = `Halo, ${nextUser.fullName}!`;
    if (universityTitle) {
      universityTitle.textContent = nextUser.university;
    }
  } catch {
    localStorage.removeItem('studyflow-token');
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    appShell.classList.add('hidden');
    authScreen.classList.remove('hidden');
  }
}

function init() {
  ensureInitialData();
  restoreSession();
  updateTodayDate();
  document.getElementById('taskDueDate').value = new Date().toISOString().slice(0, 10);

  renderSchedule();
  renderTodos();
  updateOverview();
  bindFilters();

  authTabs.forEach((tab) => tab.addEventListener('click', handleAuthTabClick));
  registerForm.addEventListener('submit', handleRegister);
  loginForm.addEventListener('submit', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);

  document.getElementById('addClassBtn').addEventListener('click', () => openScheduleModal({ day: 'Senin' }));
  scheduleGrid.addEventListener('click', handleScheduleClick);
  scheduleForm.addEventListener('submit', handleScheduleSubmit);
  document.querySelectorAll('[data-close-modal="true"]').forEach((button) => {
    button.addEventListener('click', closeScheduleModal);
  });
  todoForm.addEventListener('submit', handleAddTask);
  todoList.addEventListener('change', handleTodoInteraction);
  todoList.addEventListener('click', handleTodoInteraction);
}

init();
