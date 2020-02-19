import { Component } from '@angular/core'
import {
  LoadingController,
  ModalController,
  NavController
} from 'ionic-angular'

import {
  DefaultSettingsNotifications,
  DefaultSettingsWeeklyReport
} from '../../../../assets/data/defaultConfig'
import { AlertService } from '../../../core/services/misc/alert.service'
import { LocalizationService } from '../../../core/services/misc/localization.service'
import { UsageService } from '../../../core/services/usage/usage.service'
import { LocKeys } from '../../../shared/enums/localisations'
import { ResetOption } from '../../../shared/models/reset-options'
import { Settings } from '../../../shared/models/settings'
import { SplashPageComponent } from '../../splash/containers/splash-page.component'
import { CacheSendModalComponent } from '../components/cache-send-modal/cache-send-modal.component'
import { SettingsService } from '../services/settings.service'

@Component({
  selector: 'page-settings',
  templateUrl: 'settings-page.component.html'
})
export class SettingsPageComponent {
  settings: Settings = {}
  notificationSettings = DefaultSettingsNotifications
  weeklyReport = DefaultSettingsWeeklyReport
  showLoading = false

  constructor(
    public navCtrl: NavController,
    public loadCtrl: LoadingController,
    public alertService: AlertService,
    public localization: LocalizationService,
    private settingsService: SettingsService,
    private usage: UsageService,
    public modalCtrl: ModalController
  ) {}

  ionViewWillEnter() {
    this.usage.setPage(this.constructor.name)
    this.loadSettings()
  }

  loadSettings() {
    Object.entries(this.settingsService.getSettings()).map(([k, v]) =>
      v.then(val => (this.settings[k] = val))
    )
  }

  reloadConfig() {
    this.showLoading = true
    return this.settingsService
      .reloadConfig()
      .then(() => this.loadSettings())
      .then(() => this.backToSplash())
      .catch(e => this.showFailAlert(e))
      .then(() => (this.showLoading = false))
  }

  backToHome() {
    this.navCtrl.pop()
  }

  backToSplash() {
    this.navCtrl.setRoot(SplashPageComponent)
  }

  notificationChange() {
    this.settingsService.setNotifSettings(this.notificationSettings)
  }

  weeklyReportChange(index) {
    this.settingsService.setReportSettings(this.weeklyReport)
  }

  showFailAlert(e) {
    return this.alertService.showAlert({
      title: this.localization.translateKey(LocKeys.STATUS_FAILURE),
      message: e,
      buttons: [
        {
          text: this.localization.translateKey(LocKeys.BTN_CANCEL),
          handler: () => {}
        },
        {
          text: this.localization.translateKey(LocKeys.BTN_RETRY),
          handler: () => {
            this.reloadConfig()
          }
        }
      ]
    })
  }

  showSelectLanguage() {
    const buttons = [
      {
        text: this.localization.translateKey(LocKeys.BTN_CANCEL),
        handler: () => {}
      },
      {
        text: this.localization.translateKey(LocKeys.BTN_SET),
        handler: selectedLanguageVal => {
          this.settingsService
            .changeLanguage(selectedLanguageVal)
            .then(() => {
              this.settings.language = this.settingsService.getLanguage()
              return this.backToSplash()
            })
            .catch(e => this.showFailAlert(e))
        }
      }
    ]
    const inputs = this.settings.languagesSelectable.map(lang => ({
      type: 'radio',
      label: this.localization.translate(lang.label),
      value: JSON.stringify(lang),
      checked: lang.value === this.settings.language.value
    }))
    return this.alertService.showAlert({
      title: this.localization.translateKey(LocKeys.SETTINGS_LANGUAGE_ALERT),
      buttons: buttons,
      inputs: inputs
    })
  }

  showInfoNightMode() {
    const buttons = [
      {
        text: this.localization.translateKey(LocKeys.BTN_OKAY),
        handler: () => {}
      }
    ]
    return this.alertService.showAlert({
      title: this.localization.translateKey(
        LocKeys.SETTINGS_NOTIFICATIONS_NIGHTMOD
      ),
      message: this.localization.translateKey(
        LocKeys.SETTINGS_NOTIFICATIONS_NIGHTMOD_DESC
      ),
      buttons: buttons
    })
  }

  showConfirmReset() {
    const buttons = [
      {
        text: this.localization.translateKey(LocKeys.BTN_DISAGREE),
        handler: () => console.log('Reset cancel')
      },
      {
        text: this.localization.translateKey(LocKeys.BTN_AGREE),
        handler: () => {
          return this.showResetOptions()
        }
      }
    ]
    return this.alertService.showAlert({
      title: this.localization.translateKey(LocKeys.SETTINGS_RESET_ALERT),
      message: this.localization.translateKey(
        LocKeys.SETTINGS_RESET_ALERT_DESC
      ),
      buttons: buttons
    })
  }

  showResetOptions() {
    const buttons = [
      {
        text: this.localization.translateKey(LocKeys.BTN_CANCEL),
        handler: () => {}
      },
      {
        text: this.localization.translateKey(LocKeys.BTN_RESET),
        handler: selected => {
          const promises = []
          if (selected.includes(ResetOption.ENROLMENT))
            promises.push(this.settingsService.resetAuth())
          if (selected.includes(ResetOption.CONFIG))
            promises.push(this.settingsService.resetConfig())
          if (selected.includes(ResetOption.CACHE))
            promises.push(this.settingsService.resetCache())
          Promise.all(promises).then(() => this.backToSplash())
        }
      }
    ]
    const input = []
    for (const item in ResetOption) {
      if (item)
        input.push({ type: 'checkbox', label: item, value: ResetOption[item] })
    }
    return this.alertService.showAlert({
      title: this.localization.translateKey(LocKeys.SETTINGS_RESET_ALERT),
      message: this.localization.translateKey(
        LocKeys.SETTINGS_RESET_ALERT_OPTION_DESC
      ),
      buttons: buttons,
      inputs: input
    })
  }

  showGenerateTestNotification() {
    this.alertService.showAlert({
      title: this.localization.translateKey(LocKeys.TESTING_NOTIFICATIONS),
      message: this.localization.translateKey(
        LocKeys.TESTING_NOTIFICATIONS_MESSAGE
      ),
      buttons: [
        {
          text: this.localization.translateKey(LocKeys.BTN_OKAY),
          handler: () => {
            this.settingsService.generateTestNotif()
          }
        }
      ]
    })
  }

  sendCachedData() {
    const loader = this.loadCtrl.create({
      content:
        '<div dir="auto">' +
        this.localization.translateKey(LocKeys.SETTINGS_WAIT_ALERT) +
        '...</div>',
      duration: 15000
    })
    loader.present()
    return this.settingsService.sendCachedData().then(res => {
      loader.dismiss()
      this.showResult(res)
      this.backToHome()
    })
  }

  showResult(res) {
    const modal = this.modalCtrl.create(CacheSendModalComponent, { data: res })
    modal.present()
  }
}
