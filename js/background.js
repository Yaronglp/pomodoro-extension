import { AMOUNT_OF_POMODOROS_LONG_BREAK, POMODORO_LONG_BREAK_TIME, SECONDS_IN_MINUTE, POMODORO_SHORT_BREAK_TIME, POMODORO_CYCLE_TIME, COLOR_BADGE_BREAK, COLOR_BADGE_WORK } from './constants.js'

let pomodoroState = {
  isRunning: false,
  onLongBreak: false,
  isBreakTime: false,
  timeLeft: POMODORO_CYCLE_TIME,
  completedPomodoros: 0
}

function updateBadge() {
  if (!pomodoroState.isRunning) {
    chrome.action.setBadgeText({ text: '' })
    return
  }

  let badgeText
  let badgeColor

  if (pomodoroState.isBreakTime) {
    badgeText = pomodoroState.onLongBreak ? 'Long Break' : 'Break'
    badgeColor = COLOR_BADGE_BREAK
  } else {
    badgeText = 'Work'
    badgeColor = COLOR_BADGE_WORK
  }

  chrome.action.setBadgeText({ text: badgeText })
  chrome.action.setBadgeBackgroundColor({ color: badgeColor })
}

function startTimer() {
  if (pomodoroState.isRunning) {
    return
  }

  pomodoroState.isRunning = true
  updateBadge()
  chrome.alarms.create('pomodoroTimer', { periodInMinutes: 1 / SECONDS_IN_MINUTE })

  if (pomodoroState.timeLeft === 0) {
    pomodoroState.timeLeft = pomodoroState.isBreakTime && !pomodoroState.onLongBreak ? POMODORO_SHORT_BREAK_TIME : POMODORO_CYCLE_TIME
    pomodoroState.isBreakTime = false
  }
}

function stopTimer() {
  pomodoroState.isRunning = false
  updateBadge()
  chrome.alarms.clear('pomodoroTimer')
}

function resetTimer() {
  stopTimer()
  pomodoroState.timeLeft = POMODORO_CYCLE_TIME
  pomodoroState.isBreakTime = false
  pomodoroState.completedPomodoros = 0
  pomodoroState.onLongBreak = false
  saveState()
}

function saveState() {
  chrome.storage.local.set({pomodoroState}, () => {
    if (chrome.runtime.lastError) {
      console.error('Error saving state:', chrome.runtime.lastError)
    }
  })
}

function onWorkCycleEnd() {
  pomodoroState.completedPomodoros++
  pomodoroState.isBreakTime = true

  if (pomodoroState.completedPomodoros % AMOUNT_OF_POMODOROS_LONG_BREAK === 0) {
    pomodoroState.onLongBreak = true
    pomodoroState.timeLeft = POMODORO_LONG_BREAK_TIME
  } else {
    pomodoroState.onLongBreak = false
    pomodoroState.timeLeft = POMODORO_SHORT_BREAK_TIME
  }
}

function onBreakCycleEnd() {
  if (pomodoroState.onLongBreak) {
    resetTimer()
    return
  }

  pomodoroState.onLongBreak = false
  pomodoroState.isBreakTime = false
  pomodoroState.timeLeft = POMODORO_CYCLE_TIME
}

function completePomodoroSession() {
  if (pomodoroState.timeLeft > 0) {
    return
  }

  if (!pomodoroState.isBreakTime) {
    onWorkCycleEnd()
  } else {
    onBreakCycleEnd()
  }

  saveState()
  openAlertTab()
  updateBadge()
}

function openAlertTab() {
  chrome.tabs.create({ url: chrome.runtime.getURL(`${pomodoroState.isBreakTime ? 'html/break.html' : 'html/work.html'}`) })
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'pomodoroTimer') {
    return
  }
  
  pomodoroState.timeLeft--

  if (pomodoroState.timeLeft <= 0) {
    completePomodoroSession()
  }
})

chrome.runtime.onInstalled.addListener(() => {
  resetTimer()
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.command) {
    case 'start':
      startTimer()
      break
    case 'stop':
      stopTimer()
      break
    case 'reset':
      resetTimer()
      break
    case 'get-time':
      sendResponse({
        timeLeft: pomodoroState.timeLeft,
        isRunning: pomodoroState.isRunning,
        isBreakTime: pomodoroState.isBreakTime
      })
      break
  }
})
