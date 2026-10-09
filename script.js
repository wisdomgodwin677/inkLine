const input = document.querySelector('#task-input');
const dueInput = document.querySelector('#due-input');
const addBtn = document.querySelector('#add-btn');
const list = document.querySelector('#task-list');
const countEl = document.querySelector('#task-count');
const clearBtn = document.querySelector('#clear-btn');
const themeBtn = document.querySelector('#theme-btn');
const filterBtns = document.querySelectorAll('.filter-btn');

const STORAGE_KEY = 'notebook-tasks';
const THEME_KEY = 'notebook-theme';

/* ---------- Storage ---------- */
function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error('Could not load tasks:', err);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('Could not save tasks:', err);
  }
}

/* ---------- State ---------- */
let tasks = loadTasks();
let currentFilter = 'all'; // 'all' | 'active' | 'completed'
let editingId = null;      // id of the task being edited, or null

/* ---------- Date helpers ---------- */
function todayString() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function formatDue(due) {
  return new Date(due + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/* ---------- Sorting and filtering ---------- */
// Soonest due date first, tasks without a date go last
function sortTasks(items) {
  return [...items].sort((a, b) => {
    if (a.due && b.due) return a.due.localeCompare(b.due) || a.id - b.id;
    if (a.due) return -1;
    if (b.due) return 1;
    return a.id - b.id;
  });
}

function getVisibleTasks() {
  let result = tasks;
  if (currentFilter === 'active') result = tasks.filter((t) => !t.done);
  if (currentFilter === 'completed') result = tasks.filter((t) => t.done);
  return sortTasks(result);
}

/* ---------- Render ---------- */
function render() {
  list.innerHTML = '';

  const visible = getVisibleTasks();

  if (visible.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-msg';
    li.textContent = 'Nothing here yet...';
    list.appendChild(li);
  }

  visible.forEach((task) => {
    const li = document.createElement('li');
    li.dataset.id = task.id;
    if (task.done) li.classList.add('done');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.setAttribute('aria-label', 'Mark task complete');

    // Either a text input (editing) or a normal span
    let textEl;
    if (task.id === editingId) {
      textEl = document.createElement('input');
      textEl.type = 'text';
      textEl.className = 'edit-input';
      textEl.value = task.text;
      textEl.setAttribute('aria-label', 'Edit task');
    } else {
      textEl = document.createElement('span');
      textEl.className = 'task-text';
      textEl.textContent = task.text;
      textEl.title = 'Double-click to edit';
    }

    li.append(checkbox, textEl);

    if (task.due) {
      const badge = document.createElement('span');
      badge.className = 'due-badge';
      if (!task.done && task.due < todayString()) {
        badge.classList.add('overdue');
      }
      badge.textContent = formatDue(task.due);
      li.appendChild(badge);
    }

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = '✎';
    editBtn.setAttribute('aria-label', 'Edit task');

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '×'
    delBtn.setAttribute('aria-label', 'Delete task');

    li.append(editBtn, delBtn);
    list.appendChild(li);
  });

  // Focus the edit box after drawing
  if (editingId !== null) {
    const editInput = list.querySelector('.edit-input');
    if (editInput) {
      editInput.focus();
      editInput.select();
    }
  }

  // Counter
  const remaining = tasks.filter((t) => !t.done).length;
  countEl.textContent =
    remaining + (remaining === 1 ? ' task left' : ' tasks left');

  // Clear completed button
  clearBtn.disabled = !tasks.some((t) => t.done);

  // Active filter highlight
  filterBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === currentFilter);
  });
}

/* ---------- Actions ---------- */
function addTask() {
  const text = input.value.trim();
  if (!text) return;

  tasks.push({
    id: Date.now(),
    text,
    done: false,
    due: dueInput.value, // '' if no date chosen
  });
  saveTasks();
  render();

  input.value = '';
  dueInput.value = '';
  input.focus();
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = tasks.find((task) => task.id === id);
  if (task) task.done = !task.done;
  saveTasks();
  render();
}

function startEdit(id) {
  editingId = id;
  render();
}

function commitEdit(newText) {
  if (editingId === null) return; // already handled
  const task = tasks.find((t) => t.id === editingId);
  editingId = null;
  const text = newText.trim();
  if (task && text) task.text = text; // empty text keeps the old one
  saveTasks();
  render();
}

function cancelEdit() {
  if (editingId === null) return;
  editingId = null;
  render();
}

function clearCompleted() {
  tasks = tasks.filter((task) => !task.done);
  saveTasks();
  render();
}

/* ---------- Theme ---------- */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (err) {
    return null;
  }
}

let theme =
  getSavedTheme() ||
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(theme);

themeBtn.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (err) {
    console.error('Could not save theme:', err);
  }
});

/* ---------- Events (delegation) ---------- */
list.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li || !li.dataset.id) return;
  const id = Number(li.dataset.id);

  if (e.target.matches('.delete-btn')) deleteTask(id);
  if (e.target.matches('.edit-btn')) startEdit(id);
});

list.addEventListener('change', (e) => {
  if (!e.target.matches('input[type="checkbox"]')) return;
  toggleTask(Number(e.target.closest('li').dataset.id));
});

list.addEventListener('dblclick', (e) => {
  if (!e.target.matches('.task-text')) return;
  startEdit(Number(e.target.closest('li').dataset.id));
});

list.addEventListener('keydown', (e) => {
  if (!e.target.matches('.edit-input')) return;
  if (e.key === 'Enter') commitEdit(e.target.value);
  if (e.key === 'Escape') cancelEdit();
});

list.addEventListener('focusout', (e) => {
  if (e.target.matches('.edit-input')) commitEdit(e.target.value);
});

filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    render();
  });
});

clearBtn.addEventListener('click', clearCompleted);
addBtn.addEventListener('click', addTask);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

render();
