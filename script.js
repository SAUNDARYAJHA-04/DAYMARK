
const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskList = document.querySelector("#task-list");
const emptyMessage = document.querySelector("#empty-message");

const totalTasks = document.querySelector("#total-tasks");
const completedTasks = document.querySelector("#completed-tasks");
const progressText = document.querySelector("#progress-text");
const progressBar = document.querySelector("#progress-bar");

const STORAGE_KEY = "daymark-tasks";

let tasks = loadTasks();

function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    const parsedTasks = savedTasks ? JSON.parse(savedTasks) : [];

    if (!Array.isArray(parsedTasks)) {
      return [];
    }

    return parsedTasks.filter(
      (task) =>
        task &&
        typeof task.id === "string" &&
        typeof task.text === "string" &&
        typeof task.completed === "boolean"
    );
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    alert("Could not save tasks in this browser.");
  }
}

function renderTasks() {
  taskList.replaceChildren();

  const completedCount = tasks.filter(
    (task) => task.completed
  ).length;

  const totalCount = tasks.length;

  const percentage = totalCount === 0
    ? 0
    : Math.round((completedCount / totalCount) * 100);

  totalTasks.textContent = totalCount;
  completedTasks.textContent = completedCount;
  progressText.textContent = `${percentage}%`;
  progressBar.style.width = `${percentage}%`;

  emptyMessage.hidden = totalCount > 0;

  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = "task-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute(
      "aria-label",
      `Mark ${task.text} as complete`
    );

    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      saveTasks();
      renderTasks();
    });

    const name = document.createElement("span");
    name.className = task.completed
      ? "task-name done"
      : "task-name";
    name.textContent = task.text;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute(
      "aria-label",
      `Delete ${task.text}`
    );

    deleteButton.addEventListener("click", () => {
      tasks = tasks.filter((entry) => entry.id !== task.id);
      saveTasks();
      renderTasks();
    });

    item.append(checkbox, name, deleteButton);
    taskList.append(item);
  });
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = taskInput.value.trim();

  if (!text) {
    return;
  }

  tasks.push({
    id: crypto.randomUUID(),
    text,
    completed: false
  });

  saveTasks();
  renderTasks();

  taskForm.reset();
  taskInput.focus();
});

renderTasks();
