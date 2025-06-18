import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export class FolderSelector {
  
  /**
   * Windows에서 폴더 선택 대화상자를 표시합니다.
   * @param initialDir 초기 디렉토리 (선택사항)
   * @returns 선택된 폴더 경로 또는 null (취소시)
   */
  public static async selectFolder(initialDir?: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      try {
        // PowerShell 스크립트를 파일로 저장해서 실행 (한글 경로 문제 해결)
        const tempScriptPath = path.join(os.tmpdir(), 'folder-selector.ps1');
        
        // 초기 경로 정규화 (한글 경로 처리)
        const normalizedInitialDir = initialDir ? path.resolve(initialDir).replace(/\//g, '\\') : '';
        
        const powershellScript = `
# UTF-8 인코딩 설정
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Windows.Forms

$folderBrowser = New-Object System.Windows.Forms.FolderBrowserDialog
$folderBrowser.Description = "데이터를 저장할 폴더를 선택하세요"
$folderBrowser.ShowNewFolderButton = $true
$folderBrowser.RootFolder = [System.Environment+SpecialFolder]::MyComputer

${normalizedInitialDir ? `
if (Test-Path "${normalizedInitialDir}") {
    $folderBrowser.SelectedPath = "${normalizedInitialDir}"
}
` : ''}

$result = $folderBrowser.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    # 경로를 UTF-8로 출력
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($folderBrowser.SelectedPath)
    $encodedPath = [System.Convert]::ToBase64String($bytes)
    Write-Output "SUCCESS:$encodedPath"
} else {
    Write-Output "CANCELLED"
}
        `;

        // 임시 스크립트 파일 작성 (UTF-8 BOM 없이)
        fs.writeFileSync(tempScriptPath, powershellScript, { encoding: 'utf8' });

        // PowerShell 실행 (파일에서) - encoding 옵션 제거
        const powershell: ChildProcess = spawn('powershell', [
          '-NoProfile',
          '-ExecutionPolicy', 'Bypass',
          '-File', tempScriptPath
        ]);

        let output = '';
        let errorOutput = '';

        powershell.stdout?.on('data', (data: Buffer) => {
          output += data.toString('utf8');
        });

        powershell.stderr?.on('data', (data: Buffer) => {
          errorOutput += data.toString('utf8');
        });

        powershell.on('close', (code: number | null) => {
          // 임시 파일 정리
          try {
            fs.unlinkSync(tempScriptPath);
          } catch (e) {
            console.warn('임시 파일 삭제 실패:', e);
          }

          if (code !== 0) {
            console.error('PowerShell 실행 오류:', errorOutput);
            reject(new Error(`PowerShell 오류 (코드: ${code}): ${errorOutput}`));
            return;
          }

          const result = output.trim();
          
          if (result === 'CANCELLED' || result === '') {
            console.log('📂 폴더 선택이 취소되었습니다.');
            resolve(null);
          } else if (result.startsWith('SUCCESS:')) {
            try {
              // Base64 디코딩으로 한글 경로 복원
              const base64Path = result.replace('SUCCESS:', '');
              const decodedBytes = Buffer.from(base64Path, 'base64');
              const selectedPath = decodedBytes.toString('utf8');
              
              console.log('📂 선택된 폴더:', selectedPath);
              resolve(selectedPath);
            } catch (decodeError) {
              console.error('경로 디코딩 오류:', decodeError);
              reject(new Error(`경로 디코딩 실패: ${decodeError}`));
            }
          } else {
            console.error('예상치 못한 PowerShell 출력:', result);
            reject(new Error(`예상치 못한 결과: ${result}`));
          }
        });

        powershell.on('error', (error: Error) => {
          console.error('PowerShell 프로세스 오류:', error);
          // 임시 파일 정리
          try {
            fs.unlinkSync(tempScriptPath);
          } catch (e) {
            console.warn('임시 파일 삭제 실패:', e);
          }
          reject(error);
        });

      } catch (error) {
        console.error('폴더 선택 초기화 오류:', error);
        reject(error);
      }
    });
  }

  /**
   * 브라우저 기반 폴더 선택 (File System Access API)
   * 이 방법은 HTTPS 환경에서만 작동하며, 보안 제약이 있습니다.
   */
  public static async selectFolderBrowser(): Promise<string | null> {
    // 이 코드는 클라이언트 측에서 실행되어야 합니다.
    // 서버에서는 참조용으로만 보관합니다.
    return null;
  }

  /**
   * 폴더 경로 유효성 검증
   * @param folderPath 검증할 폴더 경로
   * @returns 유효성 검증 결과
   */
  public static validateFolderPath(folderPath: string): {
    isValid: boolean;
    error?: string;
  } {
    try {
      // 경로 정규화
      const normalizedPath = path.resolve(folderPath);
      
      // Windows 경로 검증
      if (process.platform === 'win32') {
        // 드라이브 문자 확인 (C:, D: 등)
        if (!normalizedPath.match(/^[A-Za-z]:\\/)) {
          return {
            isValid: false,
            error: '올바른 Windows 경로가 아닙니다. (예: C:\\folder)'
          };
        }
      }

      // 금지된 문자 확인
      const invalidChars = /[<>:"|?*]/;
      if (invalidChars.test(folderPath)) {
        return {
          isValid: false,
          error: '경로에 사용할 수 없는 문자가 포함되어 있습니다.'
        };
      }

      // 경로 길이 확인 (Windows 최대 경로 길이 고려)
      if (normalizedPath.length > 260) {
        return {
          isValid: false,
          error: '경로가 너무 깁니다. (최대 260자)'
        };
      }

      return { isValid: true };
      
    } catch (error) {
      return {
        isValid: false,
        error: `경로 검증 중 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      };
    }
  }

  /**
   * 디렉토리 생성 (중첩 디렉토리 지원)
   * @param dirPath 생성할 디렉토리 경로
   * @returns 생성 성공 여부
   */
  public static async createDirectory(dirPath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 디렉토리 생성: ${dirPath}`);
      }
      
      return true;
    } catch (error) {
      console.error('디렉토리 생성 실패:', error);
      return false;
    }
  }
} 