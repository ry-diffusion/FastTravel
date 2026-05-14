import React from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip
} from '@heroui/react'
import { CopyRegular } from '@fluentui/react-icons'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ErrorPhase = 'download' | 'install'

interface ErrorDiagnosis {
  title: string
  summary: string
  suggestions: string[]
}

// ---------------------------------------------------------------------------
// Diagnosis rules
// ---------------------------------------------------------------------------

const DIAGNOSES: Array<{
  test: RegExp
  build: (m: RegExpMatchArray, phase: ErrorPhase) => ErrorDiagnosis
}> = [
  {
    test: /INSTALL_FAILED_INSUFFICIENT_STORAGE|insufficient_storage/i,
    build: () => ({
      title: 'Out of storage on the Quest',
      summary:
        'The headset does not have enough free space to install this game. Android needs roughly the APK size in free space at minimum, plus extra room for the OBB data.',
      suggestions: [
        'Open the Quest and uninstall a game or two to free up space.',
        'Empty the Quest Downloads / record / camera folder if you have lots of media.',
        'Reboot the headset — some space is held by stuck installs and only frees on reboot.',
        'Check free space in the device list panel before retrying.'
      ]
    })
  },
  {
    test: /no\s*space\s*left|ENOSPC|insufficient\s*disk\s*space|disk\s*full/i,
    build: () => ({
      title: 'Out of disk space on the PC',
      summary:
        'Your computer ran out of free space while downloading or extracting this game. Large VR games need 2–3x their final size during extraction.',
      suggestions: [
        'Free up space on the drive that holds your downloads folder.',
        'Move the downloads folder to a larger drive in Settings → Download Path.',
        'Delete old completed downloads if you no longer need them.'
      ]
    })
  },
  {
    test: /INSTALL_FAILED_UPDATE_INCOMPATIBLE|signatures?\s*do\s*not\s*match|inconsistent\s*certificates/i,
    build: () => ({
      title: 'Signature mismatch',
      summary:
        'A different build of this game is already installed on the Quest and was signed with a different certificate. Android refuses to overwrite a signed app with one signed by a different key.',
      suggestions: [
        'Uninstall the existing copy on the Quest first, then retry the install.',
        'Open the game in Library, click Uninstall, then click Install.',
        'If the game has user data you want to keep, back it up first — uninstalling wipes it.'
      ]
    })
  },
  {
    test: /INSTALL_FAILED_VERSION_DOWNGRADE/i,
    build: () => ({
      title: 'Version downgrade blocked',
      summary:
        'A newer version of this game is already on the Quest. Android does not allow installing an older version on top of a newer one without first uninstalling.',
      suggestions: [
        'Uninstall the existing copy on the Quest, then retry the install.',
        'Or grab a newer version of the game if one is available in the library.'
      ]
    })
  },
  {
    test: /INSTALL_FAILED_ALREADY_EXISTS/i,
    build: () => ({
      title: 'Already installed',
      summary:
        'This package is already present on the Quest and the install was started without the replace flag.',
      suggestions: [
        'Try Reinstall instead of Install.',
        'If that still fails, uninstall the existing copy first.'
      ]
    })
  },
  {
    test: /INSTALL_FAILED_VERIFICATION_FAILURE|verification\s*failed/i,
    build: () => ({
      title: 'Install verification blocked',
      summary:
        'Android Play Protect or a device admin policy refused this APK. This is common on managed / enterprise Quests.',
      suggestions: [
        'On the Quest, open Settings → Apps → Unknown Sources and confirm the toggle is on.',
        'Disable Play Protect under Settings → Apps if it is blocking sideloads.',
        'If the Quest is enrolled in an enterprise MDM, sideloading may be policy-blocked.'
      ]
    })
  },
  {
    test: /INSTALL_FAILED_INVALID_APK|INSTALL_PARSE_FAILED|parse\s*error/i,
    build: () => ({
      title: 'APK is unreadable',
      summary:
        'Android could not parse the APK. Usually the file is corrupt — either the download was incomplete or the extracted archive is damaged.',
      suggestions: [
        'Click Delete Files, then Retry to re-download from scratch.',
        'If it fails again, try a different mirror in Settings → Mirrors.',
        'Check the install logs for the specific parse error code.'
      ]
    })
  },
  {
    test: /INSTALL_FAILED_CPU_ABI_INCOMPATIBLE|incompatible\s*cpu/i,
    build: () => ({
      title: 'CPU architecture mismatch',
      summary:
        'This APK was built for a different processor than your Quest. Quest 2/3/Pro all use arm64-v8a.',
      suggestions: [
        'Make sure you grabbed the Quest build (arm64), not a PC or phone build.',
        'Check the release notes for the correct headset target.'
      ]
    })
  },
  {
    test: /device\s*unauthorized|no\s*permissions|user\s*did\s*not\s*accept/i,
    build: () => ({
      title: 'USB debugging not authorized',
      summary:
        'The Quest is connected but has not granted this PC permission to send commands. The "Allow USB debugging?" prompt needs to be accepted on the headset.',
      suggestions: [
        'Put on the Quest and look for the authorization prompt — tap Allow.',
        'Check "Always allow from this computer" so you do not have to repeat it.',
        'If you do not see the prompt: unplug, replug, and put the headset on while plugged in.'
      ]
    })
  },
  {
    test: /device\s*'?[^']*'?\s*not\s*found|device\s*offline|no\s*devices?\s*\/?\s*emulators?\s*found/i,
    build: () => ({
      title: 'Quest is not connected',
      summary:
        'ADB cannot see the headset. This usually means the cable disconnected, the headset slept, or the Wi-Fi connection dropped.',
      suggestions: [
        'Wake the headset and check it is still on Wi-Fi (or still cabled).',
        'Re-select the device in the Devices panel.',
        'For Wi-Fi connections: re-pair via the IP bookmark.'
      ]
    })
  },
  {
    test: /(network|connection)\s*(reset|refused|timed?\s*out)|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN/i,
    build: () => ({
      title: 'Network problem talking to the mirror',
      summary:
        'The download connection failed before the file finished. This is almost always a flaky mirror or a flaky internet connection — not a problem with the game.',
      suggestions: [
        'Click Retry — rclone will resume from where it stopped.',
        'If retries keep failing, switch mirrors in Settings → Mirrors → Test All.',
        'Pause other heavy network usage and try again.'
      ]
    })
  },
  {
    test: /401|403|unauthori[sz]ed|forbidden|wrong\s*password/i,
    build: () => ({
      title: 'Mirror rejected the credentials',
      summary:
        'The mirror returned an auth error. Either the bundled password is out of date or the active mirror needs a custom config.',
      suggestions: [
        'In Settings → Server Config, click "Refresh" / re-fetch the latest config.',
        'Switch mirrors via Settings → Mirrors and re-test.',
        'If you imported a custom mirror config, double-check the credentials in it.'
      ]
    })
  },
  {
    test: /unexpected\s*end\s*of\s*data|crc\s*mismatch|wrong\s*password|cannot\s*open\s*encoded\s*stream|7z|extract/i,
    build: () => ({
      title: 'Archive extraction failed',
      summary:
        'The downloaded archive could not be unpacked. The most common cause is a partial download or a stale archive from a mirror that has not synced yet.',
      suggestions: [
        'Click Delete Files, then Retry to re-download from scratch.',
        'If the same mirror keeps producing a bad archive, switch mirrors in Settings.',
        'Make sure the host disk has 2–3x the game size free for the extraction step.'
      ]
    })
  },
  {
    test: /push.*OBB|OBB.*push|sdcard\/Android\/obb/i,
    build: () => ({
      title: 'Failed to push OBB data',
      summary:
        'The APK installed but the OBB folder (game data archive) could not be copied to the headset. The game will launch but probably show "data missing" or crash.',
      suggestions: [
        'Free up space on the Quest — OBB pushes need the full game size in /sdcard/Android/obb.',
        'Reconnect the cable and Retry — flaky USB causes partial pushes.',
        'For Wi-Fi installs: try cabled. OBB pushes are much more reliable over USB.'
      ]
    })
  },
  {
    test: /no\s*such\s*file|ENOENT|path\s*missing|invalid|download\s*path/i,
    build: () => ({
      title: 'Expected file is missing',
      summary:
        'The installer expected a file or folder that is not on disk. This usually means the download was deleted or moved between completing and installing.',
      suggestions: [
        'Click Scan Downloads in the Downloads view to re-register existing files.',
        'If that does not find it, click Delete Files and Retry to re-download.'
      ]
    })
  }
]

function diagnose(error: string, phase: ErrorPhase): ErrorDiagnosis {
  for (const rule of DIAGNOSES) {
    const m = error.match(rule.test)
    if (m) return rule.build(m, phase)
  }
  return {
    title: phase === 'install' ? 'Install failed' : 'Download failed',
    summary:
      phase === 'install'
        ? 'The install did not complete and we did not match the error against a known cause. The raw error is below.'
        : 'The download did not complete and we did not match the error against a known cause. The raw error is below.',
    suggestions: [
      'Click Retry — many transient errors clear up on a second attempt.',
      'Open Settings → Logs → View Log to see the full traceback around the failure.',
      'If the error keeps repeating, copy it below and report it so a friendlier message can be added.'
    ]
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ErrorDetailDialogProps {
  open: boolean
  onClose: () => void
  error: string | null | undefined
  phase: ErrorPhase
  contextLabel?: string
  onRetry?: () => void
  onOpenLog?: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ErrorDetailDialog: React.FC<ErrorDetailDialogProps> = ({
  open,
  onClose,
  error,
  phase,
  contextLabel,
  onRetry,
  onOpenLog
}) => {
  const raw = (error || '').trim() || '(no error message captured)'
  const diag = diagnose(raw, phase)

  const handleCopy = (): void => {
    void navigator.clipboard?.writeText(raw).catch(() => {})
  }

  const handleOpenLog = (): void => {
    if (onOpenLog) {
      onOpenLog()
      return
    }
    const api = (window as unknown as {
      api?: { logs?: { openLogFile?: () => Promise<void> } }
    }).api
    api?.logs?.openLogFile?.()
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="lg"
      scrollBehavior="inside"
      classNames={{
        backdrop: 'bg-black/60 backdrop-blur-sm',
        base: 'max-w-[560px]',
        header: 'border-b border-white/8 pb-3',
        footer: 'border-t border-white/8 pt-3'
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Chip size="sm" color="danger" variant="flat" className="text-xs">
              {phase === 'install' ? 'Install Error' : 'Download Error'}
            </Chip>
          </div>
          <span className="text-base font-semibold text-foreground">{diag.title}</span>
          {contextLabel && (
            <span className="text-xs text-default-400 font-normal">{contextLabel}</span>
          )}
        </ModalHeader>

        <ModalBody className="gap-4 py-4">
          {/* Summary */}
          <p className="text-sm text-default-600 leading-relaxed">{diag.summary}</p>

          {/* Suggestions */}
          {diag.suggestions.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-default-400 uppercase tracking-wide">
                What to try
              </span>
              <ul className="flex flex-col gap-2 pl-4">
                {diag.suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-default-600 leading-relaxed list-disc">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw error */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-default-400 uppercase tracking-wide">
              Raw error
            </span>
            <div className="rounded-medium bg-content2 border border-white/8 p-3 max-h-44 overflow-y-auto">
              <pre className="text-xs text-default-500 whitespace-pre-wrap break-words font-mono leading-relaxed">
                {raw}
              </pre>
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="gap-2">
          {onRetry && (
            <Button
              color="primary"
              variant="flat"
              size="sm"
              onClick={() => {
                onRetry()
                onClose()
              }}
            >
              Retry
            </Button>
          )}
          <Button
            variant="bordered"
            size="sm"
            startContent={<CopyRegular className="h-3.5 w-3.5" />}
            onClick={handleCopy}
          >
            Copy error
          </Button>
          <Button variant="light" size="sm" onClick={handleOpenLog}>
            Open log file
          </Button>
          <Button variant="light" size="sm" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default ErrorDetailDialog
