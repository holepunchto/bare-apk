const path = require('path')
const os = require('os')
const env = require('#env')
const fs = require('./lib/fs')
const run = require('./lib/run')
const aapt2 = require('./lib/aapt2')
const bundletool = require('./lib/bundletool')

const ANDROID_HOME = env.ANDROID_HOME || path.join(os.homedir(), '.android/sdk')
const DEFAULT_TARGET_SDK = 36

async function createAppBundle(manifest, out, opts = {}) {
  const { include = [] } = opts

  const temp = await fs.tempDir()

  try {
    const base = path.join(temp, 'base')

    await linkResources(manifest, base, { proto: true, archive: false })

    await fs.makeDir(path.join(base, 'manifest'))

    await fs.renameFile(
      path.join(base, 'AndroidManifest.xml'),
      path.join(base, 'manifest', 'AndroidManifest.xml')
    )

    const archive = path.join(temp, 'base.zip')

    await run('zip', ['-r', archive, '.'], { cwd: base })

    for (const resource of include) {
      await run('zip', ['-r', archive, path.basename(resource)], { cwd: path.dirname(resource) })
    }

    const aab = path.join(temp, 'base.aab')

    await run('java', [
      '-jar',
      bundletool,
      'build-bundle',
      '--modules',
      path.join(temp, 'base.zip'),
      '--output',
      aab
    ])

    await fs.renameFile(aab, path.resolve(out))
  } finally {
    await fs.rm(temp)
  }
}

exports.createAppBundle = createAppBundle

async function createAPKSet(bundle, out, opts = {}) {
  const { universal = false, sign = false, keystore, keystoreKey, keystorePassword } = opts

  const temp = await fs.tempDir()

  try {
    const apks = path.join(temp, 'base.apks')

    const args = [
      '-jar',
      bundletool,
      'build-apks',
      '--aapt2',
      aapt2,
      '--bundle',
      path.resolve(bundle),
      '--output',
      apks
    ]

    if (universal) args.push('--mode', 'universal')

    if (sign) {
      args.push('--ks', path.resolve(keystore), '--ks-pass', keystorePassword)

      if (keystoreKey) args.push('--ks-key-alias', keystoreKey)
    }

    await run('java', args)

    await fs.renameFile(apks, path.resolve(out))
  } finally {
    await fs.rm(temp)
  }
}

exports.createAPKSet = createAPKSet

async function createAPK(bundle, out, opts = {}) {
  const apk = path.resolve(out)

  const temp = await fs.tempDir()

  try {
    const apks = path.join(temp, 'base.apks')

    await createAPKSet(bundle, apks, { ...opts, universal: true })

    await run('unzip', [apks, 'universal.apk', '-d', temp])

    await fs.renameFile(path.join(temp, 'universal.apk'), apk)
  } finally {
    await fs.rm(temp)
  }
}

exports.createAPK = createAPK

async function linkResources(manifest, out, opts = {}) {
  const { targetSDK = DEFAULT_TARGET_SDK, proto = false, archive = true } = opts

  const args = [
    'link',
    '-o',
    out,
    '--manifest',
    manifest,
    '-I',
    path.join(ANDROID_HOME, 'platforms', `android-${targetSDK}`, 'android.jar')
  ]

  if (proto) args.push('--proto-format')

  if (!archive) {
    await fs.makeDir(out)

    args.push('--output-to-dir')
  }

  await run(aapt2, args)
}
