import 'rxjs/add/operator/map'

import { Injectable } from '@angular/core'

import { Answer } from '../../../shared/models/answer'

@Injectable()
export class AnswerService {
  answers = {}
  keys = []

  constructor() {}

  add(value: Answer) {
    this.answers[value.id] = value.value
    if (!this.check(value.id)) this.keys.push(value.id)
  }

  pop() {
    this.keys.pop()
  }

  check(id: string) {
    return this.keys.includes(id)
  }

  reset() {
    this.answers = {}
    this.keys = []
  }
}
