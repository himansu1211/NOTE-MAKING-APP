const addBtn = document.getElementById('add-note-btn');
const titleInput = document.getElementById('note-title');
const categoryInput = document.getElementById('note-category');
const contentInput = document.getElementById('note-content');
const notesGrid = document.getElementById('notes-grid');
const searchInput = document.getElementById('search');
const darkToggle = document.getElementById('dark-mode-toggle');
const exportBtn = document.getElementById('export-btn');
const toggleDrawingBtn = document.getElementById('toggle-drawing-btn');
const drawingTools = document.getElementById('drawing-tools');
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
const penTool = document.getElementById('pen-tool');
const highlightTool = document.getElementById('highlight-tool');
const eraseTool = document.getElementById('erase-tool');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const colorPicker = document.getElementById('color-picker');
const bgColorPicker = document.getElementById('bg-color-picker');
const textColorPicker = document.getElementById('text-color-picker');

let notes = JSON.parse(localStorage.getItem('notes')) || [];
// ensure notes are objects with title/content/category/timestamp (defensive)
notes = notes.map(n => {
  if (typeof n === 'object' && n !== null) {
    return {
      title: n.title || '',
      content: n.content || '',
      category: n.category || '',
      timestamp: n.timestamp || Date.now()
    };
  } else {
    return { title: '', content: String(n || ''), category: '', timestamp: Date.now() };
  }
});

let editIndex = null;
let searchTimeout = null;

// Drawing variables
let isDrawing = false;
let currentTool = 'pen';
let currentColor = '#000000';
let bgColor = '#ffffff';
let paths = [];
let undonePaths = [];
let currentPath = [];

function saveNotes() {
  localStorage.setItem('notes', JSON.stringify(notes));
}

function displayNotes(filter = '') {
  if (!notesGrid) return;
  notesGrid.innerHTML = '';
  const filterLower = (filter || '').toLowerCase();
  const safeLower = s => (s || '').toLowerCase();

  notes
    .filter(n => safeLower(n.title).includes(filterLower) || safeLower(n.content).includes(filterLower) || safeLower(n.category).includes(filterLower))
    .sort((a, b) => b.timestamp - a.timestamp) // Sort by timestamp descending
    .forEach((note, index) => {
      const noteCard = document.createElement('div');
      noteCard.classList.add('note-card');
      const date = new Date(note.timestamp).toLocaleDateString();
      noteCard.innerHTML = `
        <div class="action-btns">
          <button class="share-btn" data-index="${index}">🔗</button>
          <button class="edit-btn" data-index="${index}">✏</button>
          <button class="delete-btn" data-index="${index}">🗑</button>
        </div>
        <h2>${note.title || 'Untitled'}</h2>
        <p>${note.content || ''}</p>
        <small class="note-meta">${note.category ? note.category + ' • ' : ''}${date}</small>
      `;
      // delegate buttons to avoid inline onclick
      notesGrid.appendChild(noteCard);
    });

  // add delegated event listeners on the grid (safe even if empty)
  if (notesGrid) {
    notesGrid.querySelectorAll('.share-btn').forEach(btn => {
      btn.onclick = () => shareNote(Number(btn.dataset.index));
    });
    notesGrid.querySelectorAll('.edit-btn').forEach(btn => {
      btn.onclick = () => editNote(Number(btn.dataset.index));
    });
    notesGrid.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = () => deleteNote(Number(btn.dataset.index));
    });
  }
}

function addNote() {
  if (!titleInput || !contentInput) return;
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const category = categoryInput ? categoryInput.value : '';

  if (title === '' && content === '') return;

  if (editIndex !== null) {
    // update existing note
    notes[editIndex] = { ...notes[editIndex], title, content, category };
    editIndex = null;
    if (addBtn) addBtn.textContent = 'Add Note';
  } else {
    // add new note
    notes.push({ title, content, category, timestamp: Date.now() });
  }

  saveNotes();
  titleInput.value = '';
  if (categoryInput) categoryInput.value = '';
  contentInput.value = '';
  displayNotes(searchInput ? searchInput.value : '');
}

function deleteNote(index) {
  if (typeof index !== 'number' || index < 0 || index >= notes.length) return;
  notes.splice(index, 1);
  saveNotes();
  displayNotes(searchInput ? searchInput.value : '');
}

function editNote(index) {
  if (typeof index !== 'number' || index < 0 || index >= notes.length) return;
  const note = notes[index];
  if (titleInput) titleInput.value = note.title || '';
  if (categoryInput) categoryInput.value = note.category || '';
  if (contentInput) contentInput.value = note.content || '';
  editIndex = index;
  if (addBtn) addBtn.textContent = 'Save Changes';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function shareNote(index) {
  if (typeof index !== 'number' || index < 0 || index >= notes.length) return;
  const note = notes[index];
  const text = `📝 ${note.title || 'Untitled'}\n\n${note.content || ''}`;

  if (navigator.share) {
    navigator.share({
      title: note.title || 'Note',
      text: text,
    }).catch(() => {
      // fallback to clipboard if share fails
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text);
          alert('Note copied to clipboard!');
        } else {
          prompt('Copy the note text:', text);
        }
      } catch (err) {
        prompt('Copy the note text:', text);
      }
    });
  } else {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
        alert('Note copied to clipboard!');
      } else {
        prompt('Copy the note text:', text);
      }
    } catch (err) {
      prompt('Copy the note text:', text);
    }
  }
}

// Debounced search
function debouncedDisplayNotes() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => displayNotes(searchInput.value), 300);
}

// Event Listeners
if (addBtn) addBtn.addEventListener('click', addNote);
if (searchInput) searchInput.addEventListener('input', debouncedDisplayNotes);
if (exportBtn) exportBtn.addEventListener('click', () => {
  const dataStr = JSON.stringify(notes, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  const exportFileDefaultName = 'notes_export.json';
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
});

// Dark Mode Toggle
if (darkToggle) {
  darkToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('darkMode', isDark);
    darkToggle.textContent = isDark ? '☀' : '🌙';
  });
}

// Load dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark');
  if (darkToggle) darkToggle.textContent = '☀';
}

// Drawing functions
function startDrawing(e) {
  isDrawing = true;
  currentPath = [];
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  currentPath.push({ x, y });
}

function draw(e) {
  if (!isDrawing) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  currentPath.push({ x, y });
  redrawCanvas();
}

function stopDrawing() {
  if (!isDrawing) return;
  isDrawing = false;
  if (currentPath.length > 0) {
    paths.push({ tool: currentTool, color: currentColor, path: [...currentPath] });
    undonePaths = [];
  }
  currentPath = [];
}

function redrawCanvas() {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  paths.forEach(pathData => {
    ctx.strokeStyle = pathData.color;
    ctx.lineWidth = pathData.tool === 'highlight' ? 10 : 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = pathData.tool === 'erase' ? 'destination-out' : 'source-over';

    ctx.beginPath();
    pathData.path.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
  });

  // Draw current path
  if (currentPath.length > 0) {
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentTool === 'highlight' ? 10 : 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = currentTool === 'erase' ? 'destination-out' : 'source-over';

    ctx.beginPath();
    currentPath.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
  }
}

function undo() {
  if (paths.length > 0) {
    undonePaths.push(paths.pop());
    redrawCanvas();
  }
}

function redo() {
  if (undonePaths.length > 0) {
    paths.push(undonePaths.pop());
    redrawCanvas();
  }
}

function toggleDrawing() {
  const isVisible = drawingTools.style.display !== 'none';
  drawingTools.style.display = isVisible ? 'none' : 'flex';
  canvas.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) {
    redrawCanvas();
  }
}

// Drawing event listeners
if (canvas) {
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
}

if (toggleDrawingBtn) toggleDrawingBtn.addEventListener('click', toggleDrawing);

if (penTool) penTool.addEventListener('click', () => {
  currentTool = 'pen';
  document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
  penTool.classList.add('active');
});

if (highlightTool) highlightTool.addEventListener('click', () => {
  currentTool = 'highlight';
  document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
  highlightTool.classList.add('active');
});

if (eraseTool) eraseTool.addEventListener('click', () => {
  currentTool = 'erase';
  document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
  eraseTool.classList.add('active');
});

if (undoBtn) undoBtn.addEventListener('click', undo);
if (redoBtn) redoBtn.addEventListener('click', redo);

if (colorPicker) colorPicker.addEventListener('change', (e) => currentColor = e.target.value);
if (bgColorPicker) bgColorPicker.addEventListener('change', (e) => {
  bgColor = e.target.value;
  redrawCanvas();
});
if (textColorPicker) textColorPicker.addEventListener('change', (e) => {
  textColor = e.target.value;
  // Apply text color to textarea if needed
  if (contentInput) contentInput.style.color = textColor;
});

displayNotes(searchInput ? searchInput.value : '');
