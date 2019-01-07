import 'rxjs/add/operator/map'
import 'rxjs/add/operator/toPromise'

import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http'
import {Injectable} from '@angular/core'
import {JwtHelperService} from '@auth0/angular-jwt'
import {
  DefaultEndPoint,
  DefaultKeycloakURL,
  DefaultMetaTokenURI,
  DefaultRefreshTokenRequestBody,
  DefaultRequestEncodedContentType,
  DefaultRequestJSONContentType,
  DefaultSourceProducerAndSecret,
  DefaultSourceTypeRegistrationBody,
  DefaultSubjectsURI
} from '../../../../assets/data/defaultConfig'
import {StorageService} from '../../../core/services/storage.service'
import {StorageKeys} from '../../../shared/enums/storage'
import {InAppBrowser, InAppBrowserOptions} from '@ionic-native/in-app-browser';
import {SchedulingService} from "../../../core/services/scheduling.service";

const uuidv4 = require('uuid/v4');
declare var window: any;

@Injectable()
export class AuthService {
  URI_base: string;
  keycloakConfig: any;

  constructor(
    public http: HttpClient,
    public storage: StorageService,
    private schedule: SchedulingService,
    private jwtHelper: JwtHelperService,
    private inAppBrowser: InAppBrowser
  ) {
    this.updateURI().then(() => {
      this.keycloakConfig = {
        authServerUrl: this.URI_base,
        realm: 'mighealth',
        clientId: 'armt',
        redirectUri: 'http://ucl-mighealth-app/callback/',
      };
    });

  }

  public keycloakLogin(login: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = this.createLoginUrl(this.keycloakConfig, login);
      console.log(url);

      const options: InAppBrowserOptions = {
        zoom: 'no',
        location: 'no',
        clearsessioncache: 'yes',
        clearcache: 'yes'
      }
      const browser = this.inAppBrowser.create(url, '_blank', options);

      const listener = browser.on('loadstart').subscribe((event: any) => {
        const callback = encodeURI(event.url);
        //Check the redirect uri
        if (callback.indexOf(this.keycloakConfig.redirectUri) > -1) {
          listener.unsubscribe();
          browser.close();
          const code = this.parseUrlParamsToObject(event.url);
          this.getAccessToken(this.keycloakConfig, code).then(
            () => {
              const token = this.storage.get(StorageKeys.OAUTH_TOKENS);
              resolve(token);
            },
            () => reject("Count not login in to keycloak")
          );
        }
      });

    });
  }

  parseUrlParamsToObject(url: any) {
    const hashes = url.slice(url.indexOf('?') + 1).split('&');
    return hashes.reduce((params, hash) => {
      const [key, val] = hash.split('=');
      return Object.assign(params, {[key]: decodeURIComponent(val)})
    }, {});
  }

  createLoginUrl(keycloakConfig: any, isLogin: boolean) {
    const state = uuidv4();
    const nonce = uuidv4();
    const responseMode = 'query';
    const responseType = 'code';
    const scope = 'openid';
    return this.getUrlForAction(keycloakConfig, isLogin) +
      '?client_id=' + encodeURIComponent(keycloakConfig.clientId) +
      '&state=' + encodeURIComponent(state) +
      '&redirect_uri=' + encodeURIComponent(keycloakConfig.redirectUri) +
      '&response_mode=' + encodeURIComponent(responseMode) +
      '&response_type=' + encodeURIComponent(responseType) +
      '&scope=' + encodeURIComponent(scope) +
      '&nonce=' + encodeURIComponent(nonce);
  }

  getUrlForAction(keycloakConfig: any, isLogin: boolean) {
    return isLogin ? this.getRealmUrl(keycloakConfig) + '/protocol/openid-connect/auth'
      : this.getRealmUrl(keycloakConfig) + '/protocol/openid-connect/registrations';
  }

  retrieveUserInformation(language) {
    return new Promise((resolve, reject) => {
      this.loadUserInfo().then(res => {
        const subjectInformation: any = res
        const participantId = subjectInformation.sub
        const participantLogin = subjectInformation.username
        const projectName = subjectInformation.project ? subjectInformation.project
          : 'STAGING_PROJECT'; // TODO remove this condition. hardcoded check for testing purpose. Remove when firebase is enabled.
        const createdDate = new Date(subjectInformation.createdTimestamp);
        const createdDateMidnight = this.schedule.setDateTimeToMidnight(
          createdDate
        );
        resolve (
          this.storage.init(
            participantId,
            participantLogin,
            projectName,
            language,
            createdDate,
            createdDateMidnight
          ));
      }).catch(reject);
    });

  }


  loadUserInfo() {
    return this.storage.get(StorageKeys.OAUTH_TOKENS).then( tokens => {
      const url = this.getRealmUrl(this.keycloakConfig) + '/protocol/openid-connect/userinfo';
      const headers = this.getAccessHeaders(tokens.access_token, DefaultRequestJSONContentType);
      return this.http.get(url, {headers: headers}).toPromise();
    })
  }

  getAccessToken(kc: any, authorizationResponse: any) {
    const URI = this.getTokenUrl();
    const body = this.getAccessTokenParams(authorizationResponse.code, kc.clientId, kc.redirectUri);
    const headers = this.getTokenRequestHeaders();

    return this.createPostRequest(URI,  body, {
      header: headers,
    }).then((newTokens: any) => {
      newTokens.iat = (new Date().getTime() / 1000) - 10; // reduce 10 sec to for delay
      this.storage.set(StorageKeys.OAUTH_TOKENS, newTokens);
    });
  }

  refresh() {
    return this.storage.get(StorageKeys.OAUTH_TOKENS).then(tokens => {
      const decoded = this.jwtHelper.decodeToken(tokens.access_token)
      if (decoded.iat + tokens.expires_in < (new Date().getTime() /1000)) {
        const URI = this.getTokenUrl();
        const headers = this.getTokenRequestHeaders();
        const body = this.getRefreshParams(tokens.refresh_token, this.keycloakConfig.clientId);
        const promise = this.createPostRequest(URI, body, {
          headers: headers,
        }).then((newTokens: any) => {
          newTokens.iat = (new Date().getTime() / 1000) - 10;
          this.storage.set(StorageKeys.OAUTH_TOKENS, newTokens)
        }).catch((reason) => console.log(reason));
        return promise
      } else {
        return Promise.resolve(tokens)
      }
    })
  }

  updateURI() {
    return new Promise((resolve, reject) => {
      this.storage.get(StorageKeys.BASE_URI).then(uri => {
        const endPoint = uri ? uri : DefaultEndPoint;
        this.URI_base = endPoint + DefaultKeycloakURL;
        resolve(this.URI_base);
      });
    });
  }

  // TODO: test this
  registerToken(registrationToken) {
    const URI = this.getTokenUrl();
    // console.debug('URI : ' + URI)
    const refreshBody = DefaultRefreshTokenRequestBody + registrationToken
    const headers = this.getRegisterHeaders(DefaultRequestEncodedContentType)
    const promise = this.createPostRequest(URI, refreshBody, {
      headers: headers
    })
    return promise.then(res => {
      return this.storage.set(StorageKeys.OAUTH_TOKENS, res)
    })
  }

  registerAsSource() {
    return this.storage.get(StorageKeys.OAUTH_TOKENS).then(tokens => {
      const decoded = this.jwtHelper.decodeToken(tokens.access_token)
      const headers = this.getAccessHeaders(
        tokens.access_token,
        DefaultRequestJSONContentType
      )
      const URI = this.URI_base + DefaultSubjectsURI + decoded.sub + '/sources'
      const promise = this.createPostRequest(
        URI,
        DefaultSourceTypeRegistrationBody,
        {
          headers: headers
        }
      )
      return promise
    })
  }

  getRefreshTokenFromUrl(url) {
    return this.http.get(url).toPromise()
  }

  getURLFromToken(base, token) {
    return base + DefaultMetaTokenURI + token
  }

  createPostRequest(uri, body, headers) {
    return this.http.post(uri, body, headers).toPromise()
  }

  getSubjectInformation() {
    return this.storage.get(StorageKeys.OAUTH_TOKENS).then(tokens => {
      const decoded = this.jwtHelper.decodeToken(tokens.access_token)
      const headers = this.getAccessHeaders(
        tokens.access_token,
        DefaultRequestEncodedContentType
      )
      const URI = this.URI_base + DefaultSubjectsURI + decoded.sub
      return this.http.get(URI, { headers }).toPromise()
    })
  }

  getRegisterHeaders(contentType) {
    // TODO:: Use empty client secret https://github.com/RADAR-base/RADAR-Questionnaire/issues/140
    const headers = new HttpHeaders()
      .set('Authorization', 'Basic ' + btoa(DefaultSourceProducerAndSecret))
      .set('Content-Type', contentType)
    return headers
  }

  getAccessHeaders(accessToken, contentType) {
    return new HttpHeaders()
      .set('Authorization', 'Bearer ' + accessToken)
      .set('Content-Type', contentType);
  }

  getRefreshParams(refreshToken, clientId) {
    return new HttpParams()
      .set('grant_type', 'refresh_token')
      .set('refresh_token', refreshToken)
      .set('client_id', encodeURIComponent(clientId))
  }

  getAccessTokenParams(code , clientId, redirectUrl) {
    return new HttpParams()
      .set('grant_type', 'authorization_code')
      .set('code', code)
      .set('client_id', encodeURIComponent(clientId))
      .set('redirect_uri', redirectUrl);
  }

  getTokenUrl() {
    return this.getRealmUrl(this.keycloakConfig) + '/protocol/openid-connect/token';
  }

  getTokenRequestHeaders() {
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/x-www-form-urlencoded');

    const clientSecret = (this.keycloakConfig.credentials || {}).secret;
    if (this.keycloakConfig.clientId && clientSecret) {
      headers.set('Authorization', 'Basic ' + btoa(this.keycloakConfig.clientId + ':' + clientSecret));
    }
    return headers;
  }

  getRealmUrl(kc: any) {
    if (kc && kc.authServerUrl) {
      if (kc.authServerUrl.charAt(kc.authServerUrl.length - 1) == '/') {
        return kc.authServerUrl + 'realms/' + encodeURIComponent(kc.realm);
      } else {
        return kc.authServerUrl + '/realms/' + encodeURIComponent(kc.realm);
      }
    } else {
      return undefined;
    }
  }
}
