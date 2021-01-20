/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import {app, autoUpdater} from 'electron';
import AutoLaunch from 'auto-launch';
// import path from 'path';
// import fs from 'fs';
// import autoUpdater from 'update-electron-app';
import pac from './package.json';
import {SocketEvents} from './sockets/constants';
import * as evenCallbacks from './sockets/eventCallbacks';
import {CurrentOS} from './enums';
import InitApp from './actions/initApp';
import setAppEnvs from './actions/setAppEnvs';
import registerAgentWithVMWare, {refreshSession} from "./actions/registerAgentWithVMWare";
import io from 'socket.io-client';

import logger from './utils/logger';
const appVersion = pac.version;

let updateTimer: any = null;

const AUTO_UPDATE_URL =
  'https://api.update.rocks/update/github.com/DamieUk/jbbf-agent-releases/stable/' + process.platform + '/' + appVersion;

const isOnInstalledApp = fs.existsSync(path.resolve(path.dirname(process.execPath), '..', 'update.exe'));

autoUpdater.setFeedURL({
  url: AUTO_UPDATE_URL,
});

app.setName(pac.productName);

autoUpdater.on("checking-for-update", () => {
  logger.log('checking-for-update')
});

/*No updates available*/
autoUpdater.on("update-not-available", logger.log);

/*New Update Available*/
autoUpdater.on("update-available", logger.log);

/*Download Completion Message*/
autoUpdater.on("update-downloaded", logger.log);
const checkForUpdates = () => autoUpdater.checkForUpdates();

if (isOnInstalledApp) {
  updateTimer = setInterval(checkForUpdates, 1000 * 60);
}

let isAppRunning = false;

const initWeSockets = async (socketServerUrl: string | null) => {
  if (socketServerUrl) {
    logger.info('Connecting to websocket server...');

    const socket = io(socketServerUrl, {
      transports: ['websocket'],
      rejectUnauthorized: false,
      secure: false,
    });

    socket.on(SocketEvents.connect, evenCallbacks.onConnect(socketServerUrl));
    socket.on(SocketEvents.connectError, logger.error);
    socket.on(SocketEvents.runTest, evenCallbacks.onRunTest);

    return socket;
  } else {
    logger.info('Websocket server is not defined...');
    return null
  }
};

async function runApp() {
  app.setLoginItemSettings({
    openAsHidden: true,
    openAtLogin: true,
  });

  logger.info('Updated to version ->>>>>>>>>>>>', pac.version);

  // const isOnInstalledApp = fs.existsSync(path.resolve(path.dirname(process.execPath), '..', 'update.exe'));

  // if (isOnInstalledApp) {
    // autoUpdater({
    //   repo: 'DamieUk/jbbf-agent-releases',
    //   updateInterval: '5 minutes',
    //   logger,
    //   notifyUser: false
    // });
  // }

  if (!isAppRunning) {
    if (!app.getLoginItemSettings().wasOpenedAsHidden) {
      app.setLoginItemSettings({
        openAsHidden: true,
      });
    }

    logger.info('Starting app...');
    logger.info(`App Version: ${pac.version}`);

    const ENV_VARS = await InitApp(app, CurrentOS);

    logger.info(ENV_VARS);

    await setAppEnvs(ENV_VARS);
    await registerAgentWithVMWare(ENV_VARS);
    await initWeSockets(ENV_VARS.SOCKET_SERVER_URL);
  }


  isAppRunning = true;
  return undefined;
}

app.setLoginItemSettings({
  openAsHidden: true,
  openAtLogin: true,
});

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
    isAppRunning = false;
    refreshSession.stopSession();
    if (isOnInstalledApp) {
      clearInterval(updateTimer);
      autoUpdater.quitAndInstall();
    }
  }
});

if (process.env.E2E_BUILD === 'true') {
  // eslint-disable-next-line promise/catch-or-return
  app.whenReady().then(runApp);
} else {
  app.on('ready', runApp);
  autoUpdater.checkForUpdates();
  let autoLaunch = new AutoLaunch({
    name: 'Your app name goes here',
    path: app.getPath('exe'),
  });
  autoLaunch.isEnabled().then((isEnabled) => {
    if (!isEnabled) autoLaunch.enable();
  });
}

app.on('activate', runApp);
