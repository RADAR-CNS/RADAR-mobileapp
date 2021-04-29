import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core'
import { BackgroundMode } from '@ionic-native/background-mode/ngx'
import { Dialogs } from '@ionic-native/dialogs/ngx'
import { Vibration } from '@ionic-native/vibration/ngx'

import { LocKeys } from '../../../../../shared/enums/localisations'
import { TaskTimer, Timer } from '../../../../../shared/models/timer'
import { TranslatePipe } from '../../../../../shared/pipes/translate/translate'
import {
  getMilliseconds,
  getSeconds
} from '../../../../../shared/utilities/time'

@Component({
  selector: 'timed-test',
  templateUrl: 'timed-test.component.html'
})
export class TimedTestComponent implements OnInit, OnChanges, OnDestroy {
  @Output()
  valueChange: EventEmitter<number> = new EventEmitter<number>()
  @Input()
  heading: string
  @Input()
  image: string
  @Input()
  timer: Timer
  @Input()
  currentlyShown: boolean
  @Input()
  autoStart: boolean

  public taskTimer: TaskTimer
  startTime: number
  endTime: number
  timerInterval: any

  constructor(
    private dialogs: Dialogs,
    private vibration: Vibration,
    private background: BackgroundMode,
    private ref: ChangeDetectorRef,
    private translate: TranslatePipe
  ) {}

  ngOnInit() {
    this.background.enable()
    this.resetTimer()
  }

  ngOnDestroy() {
    this.background.disable()
  }

  ngOnChanges() {
    if (this.currentlyShown && this.autoStart) this.startTimer()
  }

  resetTimer() {
    if (!this.timer) {
      this.timer.start = 0
    }

    this.taskTimer = {
      isRunning: false,
      secondsElapsed: 0,
      secondsElapsedExact: 0,
      secondsRemaining: Math.max(this.timer.start, this.timer.end),
      duration: Math.abs(this.timer.start - this.timer.end),
      displayTime: this.timer.start
    }
  }

  handleTimer() {
    if (!this.taskTimer.isRunning) this.startTimer()
    else {
      this.stopTimer()
      this.resetTimer()
    }
  }

  startTimer() {
    this.taskTimer.isRunning = true
    this.startTime = Date.now()
    this.endTime =
      this.startTime + getMilliseconds({ seconds: this.taskTimer.duration })
    this.timerTick()
  }

  getTimerButtonText() {
    return this.translate.transform(
      this.taskTimer.isRunning
        ? LocKeys.BTN_STOP.toString()
        : LocKeys.BTN_START.toString()
    )
  }

  updateCountdown() {
    this.taskTimer.secondsElapsedExact = getSeconds({
      milliseconds: Date.now() - this.startTime
    })
    this.taskTimer.secondsElapsed = Math.floor(
      this.taskTimer.secondsElapsedExact
    )
    this.taskTimer.displayTime =
      this.timer.start > this.timer.end
        ? this.timer.start - this.taskTimer.secondsElapsed
        : this.taskTimer.secondsElapsed
    this.ref.markForCheck()
  }

  timerTick() {
    if (!this.taskTimer.isRunning) return

    this.timerInterval = setInterval(() => {
      this.updateCountdown()
      if (this.endTime - Date.now() <= 0) this.stopTimer()
    }, 1000)
  }

  stopTimer() {
    clearInterval(this.timerInterval)
    this.background.moveToForeground()
    this.dialogs.beep(1)
    this.vibration.vibrate(500)
    this.taskTimer.isRunning = false
    this.valueChange.emit(this.getEndTime())
  }

  getEndTime() {
    if (this.autoStart) return this.endTime
    else return this.taskTimer.secondsElapsedExact
  }
}
