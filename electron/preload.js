const { contextBridge, ipcRenderer } = require('electron');

// 안전한 API를 window 객체에 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 최소화 관련 함수들
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  toggleMinimalMode: () => ipcRenderer.invoke('toggle-minimal-mode'),
  restoreMainWindow: () => ipcRenderer.invoke('restore-main-window'),
  closeMinimalWindow: () => ipcRenderer.invoke('close-minimal-window'),
  
  // 윈도우 상태 확인
  isElectron: true,
  
  // 플랫폼 정보
  platform: process.platform,
  
  // 버전 정보
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
}); 