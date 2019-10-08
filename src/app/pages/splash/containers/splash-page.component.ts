import { Component } from '@angular/core'
import { NavController, NavParams, Platform } from 'ionic-angular'

import { DefaultPackageName } from '../../../../assets/data/defaultConfig'
import { AlertService } from '../../../core/services/misc/alert.service'
import { LocalizationService } from '../../../core/services/misc/localization.service'
import { UsageService } from '../../../core/services/usage/usage.service'
import { ConfigEventType } from '../../../shared/enums/events'
import { LocKeys } from '../../../shared/enums/localisations'
import { EnrolmentPageComponent } from '../../auth/containers/enrolment-page.component'
import { HomePageComponent } from '../../home/containers/home-page.component'
import { SplashService } from '../services/splash.service'

declare var window

@Component({
  selector: 'page-splash',
  templateUrl: 'splash-page.component.html'
})
export class SplashPageComponent {
  status = 'Checking enrolment...'
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private splash: SplashService,
    private alertService: AlertService,
    private localization: LocalizationService,
    private usage: UsageService,
    private platform: Platform
  ) {
    this.splash
      .evalEnrolment()
      .then(valid => (valid ? this.onStart() : this.enrol()))
  }

  onStart() {
    this.showAppUpdateAvailable()
    this.usage.sendOpenEvent()
    this.usage.setPage(this.constructor.name)
    this.status = this.localization.translateKey(
      LocKeys.SPLASH_STATUS_UPDATING_CONFIG
    )
    return this.splash
      .loadConfig()
      .then(() => {
        this.status = this.localization.translateKey(
          LocKeys.SPLASH_STATUS_SENDING_LOGS
        )
        return this.splash.sendMissedQuestionnaireLogs()
      })
      .catch(e =>
        e.message == ConfigEventType.APP_UPDATE_AVAILABLE
          ? this.showAppUpdateAvailable()
          : this.showFetchConfigFail(e)
      )
      .then(() => this.navCtrl.setRoot(HomePageComponent))
  }

  showFetchConfigFail(e) {
    this.alertService.showAlert({
      title: this.localization.translateKey(LocKeys.STATUS_FAILURE),
      message: e.message,
      buttons: [
        {
          text: this.localization.translateKey(LocKeys.BTN_RETRY),
          handler: () => {
            this.onStart()
          }
        },
        {
          text: this.localization.translateKey(LocKeys.BTN_RESET),
          handler: () => {
            this.enrol()
          }
        }
      ]
    })
  }

  showAppUpdateAvailable() {
    this.alertService.showAlert({
      title: this.localization.translateKey(LocKeys.STATUS_UPDATE_AVAILABLE),
      message: this.localization.translateKey(
        LocKeys.STATUS_UPDATE_AVAILABLE_DESC
      ),
      buttons: [
        {
          text: this.localization.translateKey(LocKeys.BTN_UPDATE),
          handler: () => {
            this.openApplicationStore()
          }
        }
      ]
    })
  }

  openApplicationStore() {
    if (this.platform.is('ios'))
      window.location.replace('itms-apps://itunes.apple.com/app/')
    else window.location.replace('market://details?id=' + DefaultPackageName)
  }

  enrol() {
    this.splash.reset().then(() => this.navCtrl.setRoot(EnrolmentPageComponent))
  }
}
