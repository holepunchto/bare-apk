interface SigningOptions {
  /** Whether to sign with `keystore`. Defaults to `false`. */
  sign?: boolean
  /** The path of the keystore to sign with. */
  keystore?: string
  /** The alias of the key in `keystore` to sign with. */
  keystoreKey?: string
  /** The password of `keystore`, such as `pass:<password>`, `env:<name>` or `file:<path>`. */
  keystorePassword?: string
}

interface PackageOptions {
  /** The SDK level to compile against. Defaults to `DEFAULT_TARGET_SDK`. */
  targetSDK?: number
  /** Files and directories to include uncompressed. */
  include?: string[]
  /** A resource directory to compile and include. */
  resources?: string
}

/**
 * Create an app bundle for the app described by the manifest at `manifest`, for distribution
 * through Google Play.
 */
declare function createAppBundle(
  manifest: string,
  out: string,
  opts?: PackageOptions
): Promise<void>

/**
 * Create the APKs for the app bundle at `bundle` with `bundletool`. Without `sign`, `bundletool`
 * signs with the debug keystore if it exists.
 */
declare function createAPKSet(
  bundle: string,
  out: string,
  opts?: SigningOptions & {
    /** Whether to create a single APK for every device. Defaults to `false`. */
    universal?: boolean
    /** Whether to write an `.apks` archive rather than a directory. Defaults to `true`. */
    archive?: boolean
  }
): Promise<void>

/**
 * Create a universal APK for the app described by the manifest at `manifest`, without an app
 * bundle, for installing directly. Each entry of `include` is added at the root of the APK under
 * its own name. Native libraries are stored uncompressed and aligned to 16 KB pages.
 *
 * Uses `zipalign` and `apksigner` from the newest build tools in `ANDROID_HOME`. Without `sign`,
 * the APK is signed with the debug keystore at `~/.android/debug.keystore`, which is created if it
 * does not exist.
 */
declare function createAPK(
  manifest: string,
  out: string,
  opts?: PackageOptions & SigningOptions
): Promise<void>

/** Read the manifest of the APK at `apk`. Each field is `null` if the manifest does not say. */
declare function readManifest(apk: string): Promise<{
  packageName: string | null
  versionCode: string | null
  versionName: string | null
  launchableActivity: string | null
}>

declare const constants: {
  /** The Android SDK, from `ANDROID_HOME` or `~/.android/sdk`. */
  ANDROID_HOME: string
  /** The default minimum SDK level. */
  DEFAULT_MINIMUM_SDK: number
  /** The default target SDK level. */
  DEFAULT_TARGET_SDK: number
}

export {
  type PackageOptions,
  type SigningOptions,
  constants,
  createAPK,
  createAPKSet,
  createAppBundle,
  readManifest
}
