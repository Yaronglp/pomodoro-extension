import { LABEL_WORK, LABEL_BREAK, LABEL_READY, POMODORO_CYCLE_TIME, SECONDS_IN_MINUTE } from './constants.js'

// Present number in two characters
function timeFormatting(stringNumber) {
  return stringNumber.toString().padStart(2, '0')
}

document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('btn-start')
  const stopBtn = document.getElementById('btn-stop')
  const resetBtn = document.getElementById('btn-reset')
  const timerDisplay = document.getElementById('display-timer')

  function updateDisplay(time) {
    const minutes = Math.floor(time / SECONDS_IN_MINUTE)
    const seconds = time % SECONDS_IN_MINUTE
    timerDisplay.textContent = `${timeFormatting(minutes)}:${timeFormatting(seconds)}`
  }

  function refreshTimerDisplay() {
    chrome.runtime.sendMessage({ command: 'get-time' }, (response) => {
      updateDisplay(response.timeLeft)
      startBtn.disabled = response.isRunning
      stopBtn.disabled = !response.isRunning

      let statusText
      
      if (response.isRunning) {
        statusText = response.isBreakTime ? LABEL_BREAK : LABEL_WORK
      } else {
        statusText = LABEL_READY
      }

      document.getElementById('display-status').textContent = statusText
    })

    chrome.storage.local.get('pomodoroState', function ({pomodoroState}) {
      const iterationAmount = pomodoroState.completedPomodoros !== undefined ? pomodoroState.completedPomodoros.toString() : '0'
      document.getElementById('iteration-count').textContent = iterationAmount
    })
  }

  startBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'start' })
    startBtn.disabled = true
    stopBtn.disabled = false
  })

  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'stop' })
    startBtn.disabled = false
    stopBtn.disabled = true
  })

  resetBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'reset' })
    updateDisplay(POMODORO_CYCLE_TIME)
    startBtn.disabled = false
    stopBtn.disabled = true
  })

  setInterval(() => {
    refreshTimerDisplay()
  }, 1000)

  refreshTimerDisplay()
})
