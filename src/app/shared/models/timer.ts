export interface Timer {
  start: number
  end: number
}

export interface TaskTimer {
  duration: number
  secondsElapsed: number
  secondsElapsedExact: number
  secondsRemaining: number
  isRunning: boolean
  displayTime: number
}
