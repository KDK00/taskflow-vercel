const { app, BrowserWindow, Tray, Menu, ipcMain, shell, screen } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let minimalWindow;
let tray;

// 개발/프로덕션 환경별 설정
const serverURL = isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, '../dist/index.html')}`;

function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: Math.min(1200, width * 0.8),
    height: Math.min(800, height * 0.8),
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    icon: path.join(__dirname, 'assets/icon.png'), // 아이콘 추가 (선택사항)
    titleBarStyle: 'default', // Windows/Linux 호환성
    show: false // 로딩 완료 후 표시
  });

  mainWindow.loadURL(serverURL);

  // 개발 환경에서만 DevTools 자동 열기
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // 창이 준비되면 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 개발 환경에서 핫 리로드 지원
    if (isDev) {
      mainWindow.webContents.on('did-fail-load', () => {
        setTimeout(() => {
          mainWindow.reload();
        }, 1000);
      });
    }
  });

  // 창 닫기 시 트레이로 최소화
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      // Windows에서 트레이 알림
      if (process.platform === 'win32' && tray) {
        tray.displayBalloon({
          iconType: 'info',
          title: '업무관리',
          content: '시스템 트레이에서 계속 실행됩니다.'
        });
      }
    }
  });

  return mainWindow;
}

function createMinimalWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  minimalWindow = new BrowserWindow({
    width: 400,
    height: 500,
    minWidth: 280,
    minHeight: 350,
    maxWidth: 600,
    maxHeight: 700,
    x: width - 420,  // 화면 우측에 배치
    y: 50,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false, // 작업표시줄에 표시
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false, // 프레임 제거하여 커스텀 타이틀바 사용
    transparent: false,
    backgroundColor: '#ffffff',
    show: false
  });

  // 최소화 윈도우용 URL (쿼리 파라미터로 모드 구분)
  const minimalURL = `${serverURL}${serverURL.includes('?') ? '&' : '?'}mode=minimal`;
  minimalWindow.loadURL(minimalURL);

  minimalWindow.once('ready-to-show', () => {
    minimalWindow.show();
  });

  minimalWindow.on('closed', () => {
    minimalWindow = null;
  });

  // 드래그 가능하게 만들기
  minimalWindow.setMovable(true);

  return minimalWindow;
}

function createTray() {
  // 트레이 아이콘 없이 간단하게 생성
  try {
    // 간단한 트레이 메뉴 (아이콘 없이)
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '메인 창 열기',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          } else {
            createMainWindow();
          }
        }
      },
      {
        label: '최소화 창 열기',
        click: () => {
          if (minimalWindow) {
            minimalWindow.show();
            minimalWindow.focus();
          } else {
            createMinimalWindow();
          }
        }
      },
      { type: 'separator' },
      {
        label: '새로고침',
        accelerator: 'F5',
        click: () => {
          if (mainWindow) mainWindow.reload();
          if (minimalWindow) minimalWindow.reload();
        }
      },
      { type: 'separator' },
      {
        label: '종료',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    // 트레이 생성 (아이콘 없이도 가능)
    // tray = new Tray(trayIcon);
    // 아이콘 없이 메뉴만 사용
    console.log('트레이 메뉴 준비 완료 (아이콘 없음)');

  } catch (error) {
    console.log('트레이 생성 오류:', error.message);
  }
}

// IPC 핸들러들
function setupIPC() {
  // 트레이로 최소화
  ipcMain.handle('minimize-to-tray', () => {
    if (mainWindow) {
      mainWindow.hide();
    }
    return true;
  });

  // 최소화 창 토글
  ipcMain.handle('toggle-minimal-mode', () => {
    if (minimalWindow) {
      if (minimalWindow.isVisible()) {
        minimalWindow.close();
      } else {
        minimalWindow.show();
        minimalWindow.focus();
      }
    } else {
      createMinimalWindow();
    }
    return true;
  });

  // 메인 창 복원
  ipcMain.handle('restore-main-window', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } else {
      createMainWindow();
    }
    return true;
  });

  // 최소화 창 닫기
  ipcMain.handle('close-minimal-window', () => {
    if (minimalWindow) {
      minimalWindow.close();
    }
    return true;
  });

  // 외부 링크 열기
  ipcMain.handle('open-external', (event, url) => {
    shell.openExternal(url);
    return true;
  });

  // 창 크기 정보 가져오기
  ipcMain.handle('get-window-bounds', () => {
    if (mainWindow) {
      return mainWindow.getBounds();
    }
    return null;
  });

  // 창 크기 설정
  ipcMain.handle('set-window-bounds', (event, bounds) => {
    if (mainWindow) {
      mainWindow.setBounds(bounds);
    }
    return true;
  });
}

// 앱 이벤트 핸들러
app.whenReady().then(() => {
  // 단일 인스턴스 확인
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    // 두 번째 인스턴스 실행 시 기존 창을 포커스
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  createMainWindow();
  createTray();
  setupIPC();

  // macOS 동작
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  // macOS에서는 명시적으로 종료하지 않는 한 앱을 유지
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

// 보안 설정
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });

  contents.on('will-navigate', (event, navigationUrl) => {
    if (navigationUrl !== serverURL && !navigationUrl.startsWith(serverURL)) {
      event.preventDefault();
    }
  });
});

// 개발 환경 핫 리로드 (선택사항)
if (isDev) {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    });
  } catch (error) {
    console.log('Electron reload not available');
  }
} 