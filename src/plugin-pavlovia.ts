import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";
import $ from "jquery";

const info = <const>{
    name: 'pavlovia',
    description: 'communication with pavlovia.org',
    parameters: {
        command: {
            type: ParameterType.STRING,
            default: 'init',
            description: 'The pavlovia command: "init" (default) or "finish"',
        },
        participantId: {
            type: ParameterType.STRING,
            default: 'PARTICIPANT',
            description: 'The participant Id: "PARTICIPANT" (default) or any string',
        },
        errorCallback: {
            type: ParameterType.FUNCTION,
            default: (error: any) => {
                console.error('[pavlovia 3.0.0]', error);
                let htmlCode = '<h3>[jspsych-pavlovia plugin 3.0.0] Error</h3><ul>';
                while (true) {
                    if (typeof error === 'object' && 'context' in error) {
                        htmlCode += '<li>' + error.context + '</li>';
                        error = error.error;
                    } else {
                        htmlCode += '<li><b>' + error + '</b></li>';
                        break;
                    }
                }
                htmlCode += '</ul>';
                const bodyElement = document.querySelector('body');
                if (bodyElement !== null) {
                    bodyElement.innerHTML = htmlCode;
                }
            },
            description: 'The callback function called whenever an error has occurred',
        },
    },
};

type Info = typeof info;

class PavloviaPlugin implements JsPsychPlugin<Info> {
    static info = info;

    private version = '3.0.0';
    private _config: any = {};
    private _serverMsg = new Map<string, string>();
    private _beforeunloadCallback: ((event: BeforeUnloadEvent) => void) = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        event.returnValue = '';
    };

    constructor(private jsPsych: JsPsych) {}

    trial(display_element: HTMLElement, trial: TrialType<Info>) {
        switch (trial.command!.toLowerCase()) {
            case 'init':
                this._init(trial);
                break;
            case 'finish':
                const data = this.jsPsych.data.get().csv();
                this._finish(trial, data);
                break;
            default:
                trial.errorCallback!('unknown command: ' + trial.command);
        }
        this.jsPsych.finishTrial();
    }

    private async _init(trial: TrialType<Info>, configURL = 'config.json') {
        try {
            const response = await this._configure(configURL);
            this._config = response.config;
            this._log('init | _configure.response=', response);

            const sessionResponse = await this._openSession();
            this._log('init | _openSession.response=', sessionResponse);

            this._beforeunloadCallback = (event) => {
                event.preventDefault();
                event.returnValue = '';
            };
            window.addEventListener('beforeunload', this._beforeunloadCallback);

            window.addEventListener('unload', () => {
                if (this._config.session.status === 'OPEN') {
                    if (this._config.experiment.saveIncompleteResults) {
                        const data = this.jsPsych.data.get().csv();
                        this._save(trial, data, true);
                    }
                    this._closeSession(false, true);
                }
            });
        } catch (error) {
            trial.errorCallback!(error);
        }
    }

    private async _finish(trial: TrialType<Info>, data: string) {
        try {
            window.removeEventListener('beforeunload', this._beforeunloadCallback);
            const saveResponse = await this._save(trial, data, false);
            this._log('finish | _save.response=', saveResponse);

            const closeResponse = await this._closeSession(true, false);
            this._log('finish | _closeSession.response=', closeResponse);
        } catch (error) {
            trial.errorCallback!(error);
        }
    }

    private async _configure(configURL: string) {
        const response = { origin: '_configure', context: 'when configuring the plugin' };

        try {
            const configResponse = await this._getConfiguration(configURL);
            
            if (typeof configResponse.config !== 'object') {
                throw 'Invalid configuration response';
            }

            if ('psychoJsManager' in configResponse.config) {
                delete configResponse.config.psychoJsManager;
                configResponse.config.pavlovia = {
                    URL: 'https://pavlovia.org',
                };
            }

            if (!('experiment' in configResponse.config)) throw 'missing experiment block in configuration';
            if (!('name' in configResponse.config.experiment)) throw 'missing name in experiment block in configuration';
            if (!('fullpath' in configResponse.config.experiment)) throw 'missing fullpath in experiment block in configuration';
            if (!('pavlovia' in configResponse.config)) throw 'missing pavlovia block in configuration';
            if (!('URL' in configResponse.config.pavlovia)) throw 'missing URL in pavlovia block in configuration';

            const urlQuery = window.location.search.slice(1);
            const urlParameters = new URLSearchParams(urlQuery);
            urlParameters.forEach((value, key) => {
                if (key.indexOf('__') === 0) this._serverMsg.set(key, value);
            });

            return configResponse;
        } catch (error) {
            throw { ...response, error };
        }
    }

    private async _getConfiguration(configURL: string) {
        const response = { origin: '_getConfiguration', context: 'when reading the configuration file: ' + configURL };
    
        return new Promise<any>((resolve, reject) => {
            $.get(configURL, 'json')
                .done((config, textStatus, jqXHR) => {
                    const contentType = jqXHR.getResponseHeader("Content-Type");
                    if (contentType && contentType.includes("application/json")) {
                        resolve({ ...response, config });
                    } else {
                        reject({ ...response, error: "Unexpected content type: " + contentType });
                    }
                })
                .fail((jqXHR) => {
                    reject({ ...response, error: jqXHR.responseJSON || jqXHR.responseText });
                });
        });
    }
    

    private async _openSession() {
        const response = {
            origin: '_openSession',
            context: 'when opening a session for experiment: ' + this._config.experiment.fullpath,
        };

        const data: any = {};
        if (this._serverMsg.has('__pilotToken')) data.pilotToken = this._serverMsg.get('__pilotToken');

        const url = `${this._config.pavlovia.URL}/api/v2/experiments/${encodeURIComponent(this._config.experiment.fullpath)}/sessions`;

        return new Promise<any>((resolve, reject) => {
            $.post(url, data, null, 'json').done((data) => {
                if (!('token' in data)) reject({ ...response, error: 'unexpected answer from server: no token' });
                if (!('experiment' in data)) reject({ ...response, error: 'unexpected answer from server: no experiment' });

                this._config.session = { token: data.token, status: 'OPEN' };
                this._config.experiment.status = data.experiment.status2;
                this._config.experiment.saveFormat = Symbol.for(data.experiment.saveFormat);
                this._config.experiment.saveIncompleteResults = data.experiment.saveIncompleteResults;
                this._config.experiment.license = data.experiment.license;
                this._config.runMode = data.experiment.runMode;

                resolve({ ...response, token: data.token, status: data.status });
            }).fail((jqXHR) => {
                console.error('error:', jqXHR.responseText);
                reject({ ...response, error: jqXHR.responseJSON });
            });
        });
    }

    private async _closeSession(isCompleted = true, sync = false) {
        const response = {
            origin: '_closeSession',
            context: 'when closing the session for experiment: ' + this._config.experiment.fullpath,
        };

        const url = `${this._config.pavlovia.URL}/api/v2/experiments/${encodeURIComponent(this._config.experiment.fullpath)}/sessions/${this._config.session.token}`;

        if (sync) {
            const formData = new FormData();
            formData.append('isCompleted', isCompleted.toString());
            navigator.sendBeacon(url + '/delete', formData);
            this._config.session.status = 'CLOSED';
        } else {
            return new Promise<any>((resolve, reject) => {
                $.ajax({
                    url,
                    type: 'delete',
                    data: { isCompleted },
                    dataType: 'json',
                }).done((data) => {
                    this._config.session.status = 'CLOSED';
                    resolve({ ...response, data });
                }).fail((jqXHR) => {
                    console.error('error:', jqXHR.responseText);
                    reject({ ...response, error: jqXHR.responseJSON });
                });
            });
        }
    }

    private async _save(trial: TrialType<Info>, data: string, sync = false) {
        const date = new Date();
        const dateString = `${date.getFullYear()}-${('0' + (1 + date.getMonth())).slice(-2)}-${('0' + date.getDate()).slice(-2)}_${('0' + date.getHours()).slice(-2)}h${('0' + date.getMinutes()).slice(-2)}.${('0' + date.getSeconds()).slice(-2)}.${date.getMilliseconds()}`;
        const key = `${this._config.experiment.name}_${trial.participantId}_SESSION_${dateString}.csv`;

        if (this._config.experiment.status === 'RUNNING' && !this._serverMsg.has('__pilotToken')) {
            return await this._uploadData(key, data, sync);
        } else {
            this._offerDataForDownload(key, data, 'text/csv');
            return {
                origin: '_save',
                context: 'when saving results for experiment: ' + this._config.experiment.fullpath,
                message: 'offered the .csv file for download',
            };
        }
    }

    private async _uploadData(key: string, value: string, sync = false) {
        const response = {
            origin: '_uploadData',
            context: 'when uploading participant\'s results for experiment: ' + this._config.experiment.fullpath,
        };

        const url = `${this._config.pavlovia.URL}/api/v2/experiments/${encodeURIComponent(this._config.experiment.fullpath)}/sessions/${this._config.session.token}/results`;

        if (sync) {
            const formData = new FormData();
            formData.append('key', key);
            formData.append('value', value);
            navigator.sendBeacon(url, formData);
        } else {
            return new Promise<any>((resolve, reject) => {
                const data = { key, value };

                $.post(url, data, null, 'json').done((serverData) => {
                    resolve({ ...response, serverData });
                }).fail((jqXHR) => {
                    console.error('error:', jqXHR.responseText);
                    reject({ ...response, error: jqXHR.responseJSON });
                });
            });
        }
    }

    private _log(...messages: any[]) {
        console.log('[pavlovia ' + this.version + ']', ...messages);
    }

    private _offerDataForDownload(filename: string, data: string, type: string) {
        const blob = new Blob([data], { type });

        if ((window.navigator as any).msSaveOrOpenBlob) {
            (window.navigator as any).msSaveBlob(blob, filename);
        } else {
            const elem = document.createElement('a');
            elem.href = window.URL.createObjectURL(blob);
            elem.download = filename;
            document.body.appendChild(elem);
            elem.click();
            document.body.removeChild(elem);
        }
    }
}

export default PavloviaPlugin;
