
/* =========================================
   DAYMARK — DASHBOARD FUNCTIONALITY
   ========================================= */

"use strict";

// Storage keys
const TASKS_KEY = "daymark-tasks";
const HISTORY_KEY = "daymark-history";

// DOM elements
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskPriority = document.getElementById("task-priority");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");

const totalTasksElement = document.getElementById("total-tasks");
const completedTasksElement = document.getElementById("completed-tasks");
const progressPercentageElement =
    document.getElementById("progress-percentage");
const progressFill = document.getElementById("progress-fill");
const progressTrack = document.getElementById("progress-track");
const taskCountBadge = document.getElementById("task-count-badge");

const currentDateElement = document.getElementById("current-date");
const liveClockElement = document.getElementById("live-clock");

const historyChart = document.getElementById("history-chart");
const historyEmpty = document.getElementById("history-empty");

const timerDisplay = document.getElementById("timer-display");
const timerMode = document.getElementById("timer-mode");
const timerStartButton = document.getElementById("timer-start");
const timerResetButton = document.getElementById("timer-reset");
const focusPresetButton = document.getElementById("focus-preset");
const breakPresetButton = document.getElementById("break-preset");
const focusSessionsElement = document.getElementById("focus-sessions");

const startFiveMinutesButton =
    document.getElementById("start-five-minutes");
const dismissReminderButton =
    document.getElementById("dismiss-reminder");

const footerYear = document.getElementById("footer-year");

// Constants
const PRIORITY_ORDER = {
    high: 1,
    medium: 2,
    low: 3
};

const PRIORITY_LABELS = {
    high: "High",
    medium: "Medium",
    low: "Low"
};

// Application state
let tasks = loadTasks();
let history = loadHistory();

let timerDuration = 25 * 60;
let remainingSeconds = timerDuration;
let timerInterval = null;
let timerEndTime = null;
let timerRunning = false;
let currentTimerMode = "focus";

// =========================================
// DATE HELPERS
// =========================================

function getTodayKey() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function updateDateAndClock() {
    const now = new Date();

    currentDateElement.textContent = now.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    });

    liveClockElement.textContent = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    });

    footerYear.textContent = now.getFullYear();
}

// =========================================
// LOCAL STORAGE
// =========================================

function loadTasks() {
    try {
        const savedTasks = localStorage.getItem(TASKS_KEY);

        if (!savedTasks) {
            return [];
        }

        const parsedTasks = JSON.parse(savedTasks);

        if (!Array.isArray(parsedTasks)) {
            return [];
        }

        return parsedTasks
            .filter(task =>
                task &&
                typeof task.title === "string" &&
                typeof task.id === "string"
            )
            .map(task => ({
                id: task.id,
                title: task.title,
                completed: Boolean(task.completed),
                priority: PRIORITY_ORDER[task.priority]
                    ? task.priority
                    : "medium",
                createdAt: task.createdAt || new Date().toISOString(),
                completedAt: task.completedAt || null
            }));
    } catch (error) {
        console.error("Could not load tasks:", error);
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    } catch (error) {
        console.error("Could not save tasks:", error);
        alert("Your tasks could not be saved in this browser.");
    }
}

function loadHistory() {
    try {
        const savedHistory = localStorage.getItem(HISTORY_KEY);

        if (!savedHistory) {
            return {};
        }

        const parsedHistory = JSON.parse(savedHistory);

        return parsedHistory &&
            typeof parsedHistory === "object" &&
            !Array.isArray(parsedHistory)
            ? parsedHistory
            : {};
    } catch (error) {
        console.error("Could not load history:", error);
        return {};
    }
}

function saveHistory() {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.error("Could not save history:", error);
    }
}

// =========================================
// DAILY HISTORY
// =========================================

function getTodayHistory() {
    const today = getTodayKey();

    if (!history[today] || typeof history[today] !== "object") {
        history[today] = {
            completed: 0,
            focusSessions: 0
        };
    }

    if (!Number.isFinite(history[today].completed)) {
        history[today].completed = 0;
    }

    if (!Number.isFinite(history[today].focusSessions)) {
        history[today].focusSessions = 0;
    }

    return history[today];
}

function recordTaskCompletion() {
    const today = getTodayHistory();

    today.completed += 1;

    saveHistory();
}

function recordFocusSession() {
    const today = getTodayHistory();

    today.focusSessions += 1;

    saveHistory();
    renderFocusSessions();
    renderHistory();
}

// =========================================
// ADD TASK
// =========================================

taskForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = taskInput.value.trim();
    const priority = taskPriority.value;

    if (!title) {
        taskInput.focus();
        return;
    }

    if (!PRIORITY_ORDER[priority]) {
        return;
    }

    const task = {
        id: createTaskId(),
        title: title,
        completed: false,
        priority: priority,
        createdAt: new Date().toISOString(),
        completedAt: null
    };

    tasks.push(task);

    saveTasks();
    renderTasks();
    updateStatistics();

    taskInput.value = "";
    taskInput.focus();
});

function createTaskId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// =========================================
// COMPLETE AND DELETE TASKS
// =========================================

function toggleTask(taskId) {
    const task = tasks.find(item => item.id === taskId);

    if (!task) {
        return;
    }

    task.completed = !task.completed;

    if (task.completed) {
        task.completedAt = new Date().toISOString();
        recordTaskCompletion();
    } else {
        task.completedAt = null;
    }

    saveTasks();
    renderTasks();
    updateStatistics();
}

function deleteTask(taskId) {
    tasks = tasks.filter(task => task.id !== taskId);

    saveTasks();
    renderTasks();
    updateStatistics();
}

// =========================================
// RENDER TASKS
// =========================================

function renderTasks() {
    taskList.replaceChildren();

    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.completed !== b.completed) {
            return Number(a.completed) - Number(b.completed);
        }

        const priorityDifference =
            PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];

        if (priorityDifference !== 0) {
            return priorityDifference;
        }

        return new Date(a.createdAt) - new Date(b.createdAt);
    });

    sortedTasks.forEach(task => {
        const item = document.createElement("article");
        item.className = "task-item";

        if (task.completed) {
            item.classList.add("completed");
        }

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute(
            "aria-label",
            `Mark ${task.title} as ${task.completed ? "incomplete" : "complete"}`
        );

        checkbox.addEventListener("change", () => {
            toggleTask(task.id);
        });

        const content = document.createElement("div");
        content.className = "task-content";

        const title = document.createElement("p");
        title.className = "task-title";
        title.textContent = task.title;

        const meta = document.createElement("div");
        meta.className = "task-meta";

        const priorityBadge = document.createElement("span");
        priorityBadge.className = `priority-badge priority-${task.priority}`;
        priorityBadge.textContent = PRIORITY_LABELS[task.priority];

        meta.appendChild(priorityBadge);

        const dateLabel = document.createElement("span");
        dateLabel.className = "task-date";
        dateLabel.textContent = task.completed
            ? "Completed"
            : "In progress";

        meta.appendChild(dateLabel);

        content.append(title, meta);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-task";
        deleteButton.textContent = "×";
        deleteButton.setAttribute("aria-label", `Delete ${task.title}`);

        deleteButton.addEventListener("click", () => {
            deleteTask(task.id);
        });

        item.append(checkbox, content, deleteButton);
        taskList.appendChild(item);
    });

    emptyState.hidden = tasks.length > 0;
}

// =========================================
// DASHBOARD STATISTICS
// =========================================

function updateStatistics() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    totalTasksElement.textContent = total;
    completedTasksElement.textContent = completed;
    progressPercentageElement.textContent = percentage;

    progressFill.style.width = `${percentage}%`;
    progressTrack.setAttribute("aria-valuenow", percentage);

    taskCountBadge.textContent =
        `${total} ${total === 1 ? "task" : "tasks"}`;
}

// =========================================
// FOCUS TIMER
// =========================================

function setTimerMode(mode) {
    stopTimer();

    currentTimerMode = mode;

    timerDuration = mode === "focus"
        ? 25 * 60
        : 5 * 60;

    remainingSeconds = timerDuration;

    timerMode.textContent = mode === "focus"
        ? "FOCUS SESSION"
        : "SHORT RESET";

    focusPresetButton.classList.toggle(
        "active",
        mode === "focus"
    );

    breakPresetButton.classList.toggle(
        "active",
        mode === "break"
    );

    timerStartButton.textContent =
        mode === "focus" ? "Start focus" : "Start reset";

    updateTimerDisplay();
    updateTimerRing();
}

function startTimer() {
    if (timerRunning) {
        pauseTimer();
        return;
    }

    if (remainingSeconds <= 0) {
        remainingSeconds = timerDuration;
    }

    timerRunning = true;
    timerEndTime = Date.now() + remainingSeconds * 1000;

    timerStartButton.textContent = "Pause";

    timerInterval = setInterval(tickTimer, 250);

    tickTimer();
}

function tickTimer() {
    if (!timerRunning || timerEndTime === null) {
        return;
    }

    remainingSeconds = Math.max(
        0,
        Math.ceil((timerEndTime - Date.now()) / 1000)
    );

    updateTimerDisplay();
    updateTimerRing();

    if (remainingSeconds === 0) {
        finishTimer();
    }
}

function pauseTimer() {
    if (!timerRunning) {
        return;
    }

    remainingSeconds = Math.max(
        0,
        Math.ceil((timerEndTime - Date.now()) / 1000)
    );

    stopTimer();

    updateTimerDisplay();
    updateTimerRing();

    timerStartButton.textContent = "Resume";
}

function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
    }

    timerInterval = null;
    timerRunning = false;
    timerEndTime = null;
}

function resetTimer() {
    stopTimer();

    remainingSeconds = timerDuration;

    timerStartButton.textContent =
        currentTimerMode === "focus"
            ? "Start focus"
            : "Start reset";

    updateTimerDisplay();
    updateTimerRing();
}

function finishTimer() {
    const finishedMode = currentTimerMode;

    stopTimer();

    remainingSeconds = 0;

    updateTimerDisplay();
    updateTimerRing();

    timerStartButton.textContent = "Start again";

    if (finishedMode === "focus") {
        recordFocusSession();

        alert("Focus session complete. Take a short break.");
    } else {
        alert("Break complete. Return to your next task.");
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    timerDisplay.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateTimerRing() {
    const progress = timerDuration > 0
        ? (timerDuration - remainingSeconds) / timerDuration
        : 0;

    const degrees = Math.min(360, Math.max(0, progress * 360));

    const ring = document.querySelector(".timer-ring");

    ring.style.background = `
        conic-gradient(
            var(--lime) ${degrees}deg,
            #39442a ${degrees}deg,
            #30352c 360deg
        )
    `;
}

timerStartButton.addEventListener("click", startTimer);
timerResetButton.addEventListener("click", resetTimer);

focusPresetButton.addEventListener("click", () => {
    setTimerMode("focus");
});

breakPresetButton.addEventListener("click", () => {
    setTimerMode("break");
});

// =========================================
// FOCUS SESSION COUNTER
// =========================================

function renderFocusSessions() {
    let totalSessions = 0;

    Object.values(history).forEach(day => {
        if (
            day &&
            Number.isFinite(day.focusSessions) &&
            day.focusSessions > 0
        ) {
            totalSessions += day.focusSessions;
        }
    });

    focusSessionsElement.textContent = totalSessions;
}

// =========================================
// SEVEN-DAY HISTORY CHART
// =========================================

function renderHistory() {
    historyChart.replaceChildren();

    const days = [];

    for (let offset = 6; offset >= 0; offset--) {
        const date = new Date();

        date.setDate(date.getDate() - offset);

        const key = getDateKey(date);
        const dayHistory = history[key] || {};

        const completed = Number.isFinite(dayHistory.completed)
            ? dayHistory.completed
            : 0;

        const sessions = Number.isFinite(dayHistory.focusSessions)
            ? dayHistory.focusSessions
            : 0;

        days.push({
            key,
            label: date.toLocaleDateString("en-IN", {
                weekday: "short"
            }),
            completed,
            sessions
        });
    }

    const hasHistory = days.some(day =>
        day.completed > 0 || day.sessions > 0
    );

    historyEmpty.hidden = hasHistory;

    const maximum = Math.max(
        1,
        ...days.map(day => day.completed + day.sessions)
    );

    days.forEach(day => {
        const column = document.createElement("div");
        column.className = "history-day";

        const value = day.completed + day.sessions;

        const valueLabel = document.createElement("span");
        valueLabel.className = "history-day-value";
        valueLabel.textContent = value;

        const track = document.createElement("div");
        track.className = "history-bar-track";

        const bar = document.createElement("div");
        bar.className = "history-bar";

        const height = value === 0
            ? 3
            : Math.max(8, (value / maximum) * 100);

        bar.style.height = `${height}%`;

        bar.title =
            `${day.completed} tasks completed, ${day.sessions} focus sessions`;

        track.appendChild(bar);

        const label = document.createElement("span");
        label.className = "history-day-label";
        label.textContent = day.label;

        column.append(valueLabel, track, label);
        historyChart.appendChild(column);
    });
}

// =========================================
// FIVE-MINUTE START REMINDER
// =========================================

startFiveMinutesButton.addEventListener("click", () => {
    setTimerMode("focus");

    // Begin a five-minute timer for getting started.
    stopTimer();

    timerDuration = 5 * 60;
    remainingSeconds = timerDuration;
    currentTimerMode = "focus";

    timerMode.textContent = "FIVE-MINUTE START";

    focusPresetButton.classList.remove("active");
    breakPresetButton.classList.remove("active");

    updateTimerDisplay();
    updateTimerRing();

    startTimer();

    document.getElementById("focus").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
});

dismissReminderButton.addEventListener("click", () => {
    const banner = document.querySelector(".reminder-banner");

    banner.style.transition = "opacity 0.2s ease";
    banner.style.opacity = "0";

    setTimeout(() => {
        banner.hidden = true;
    }, 200);
});

// =========================================
// INITIALISE APPLICATION
// =========================================

function initialiseDaymark() {
    updateDateAndClock();

    setInterval(updateDateAndClock, 1000);

    renderTasks();
    updateStatistics();
    renderFocusSessions();
    renderHistory();

    setTimerMode("focus");
}

initialiseDaymark();
