const path = require('path')
const os = require('os')
const env = require('#env')
const fs = require('./lib/fs')
const run = require('./lib/run')
const aapt2 = require('./lib/aapt2')
const bundletool = require('./lib/bundletool')
const buildTools = require('./lib/build-tools')

const ANDROID_HOME = env.ANDROID_HOME || path.join(os.homedir(), '.android/sdk')
const DEFAULT_MINIMUM_SDK = 31
const DEFAULT_TARGET_SDK = 36

exports.constants = {
  ANDROID_HOME,
  DEFAULT_MINIMUM_SDK,
  DEFAULT_TARGET_SDK
}

async function createAppBundle(manifest, out, opts = {}) {
  const { targetSDK = DEFAULT_TARGET_SDK, include = [], resources } = opts

  out = path.resolve(out)

  await fs.makeDir(path.dirname(out))

  const temp = await fs.tempDir()

  try {
    let res

    if (resources) {
      res = path.join(temp, 'res.zip')

      await compileResources(resources, res)
    }

    const base = path.join(temp, 'base')

    await linkResources(manifest, base, { targetSDK, resources: res, proto: true, archive: false })

    await fs.makeDir(path.join(base, 'manifest'))

    await fs.renameFile(
      path.join(base, 'AndroidManifest.xml'),
      path.join(base, 'manifest', 'AndroidManifest.xml')
    )

    const archive = path.join(temp, 'base.zip')

    await run('jar', [
      '--create',
      '--no-compress',
      '--no-manifest',
      '--file',
      archive,
      '-C',
      base,
      '.',
      ...included(include)
    ])

    await run('java', [
      '-jar',
      bundletool,
      'build-bundle',
      '--modules',
      path.join(temp, 'base.zip'),
      '--output',
      out,
      '--overwrite'
    ])
  } finally {
    await fs.rm(temp)
  }
}

exports.createAppBundle = createAppBundle

async function createAPKSet(bundle, out, opts = {}) {
  const {
    universal = false,
    archive = true,
    sign = false,
    keystore,
    keystoreKey,
    keystorePassword
  } = opts

  out = path.resolve(out)

  await fs.makeDir(path.dirname(out))

  const args = [
    '-jar',
    bundletool,
    'build-apks',
    '--aapt2',
    aapt2,
    '--bundle',
    path.resolve(bundle),
    '--output',
    out
  ]

  if (universal) args.push('--mode', 'universal')

  if (archive) args.push('--overwrite')
  else args.push('--output-format', 'DIRECTORY')

  if (sign) {
    args.push('--ks', path.resolve(keystore), '--ks-pass', keystorePassword)

    if (keystoreKey) args.push('--ks-key-alias', keystoreKey)
  }

  await run('java', args)
}

exports.createAPKSet = createAPKSet

// Native libraries are stored uncompressed and aligned to 16 KB pages, so that
// they are loaded straight from the APK.
async function createAPK(manifest, out, opts = {}) {
  const {
    targetSDK = DEFAULT_TARGET_SDK,
    include = [],
    resources,
    sign = false,
    keystore,
    keystoreKey,
    keystorePassword
  } = opts

  out = path.resolve(out)

  await fs.makeDir(path.dirname(out))

  const { zipalign, apksigner } = await buildTools(ANDROID_HOME)

  const temp = await fs.tempDir()

  try {
    let res

    if (resources) {
      res = path.join(temp, 'res.zip')

      await compileResources(resources, res)
    }

    const unaligned = path.join(temp, 'unaligned.apk')

    await linkResources(manifest, unaligned, { targetSDK, resources: res })

    if (include.length > 0) {
      await run('jar', [
        '--update',
        '--no-compress',
        '--no-manifest',
        '--file',
        unaligned,
        ...included(include)
      ])
    }

    const aligned = path.join(temp, 'aligned.apk')

    await run(zipalign, ['-P', '16', '-f', '4', unaligned, aligned])

    // JAR signing is applied whatever the minimum SDK, though it is only verified
    // below API level 24.
    const v1 = (await minimumSDK(unaligned)) < 24

    const args = [
      '-jar',
      apksigner,
      'sign',
      '--v1-signing-enabled',
      String(v1),
      '--v4-signing-enabled',
      'false'
    ]

    if (sign) {
      args.push('--ks', path.resolve(keystore), '--ks-pass', keystorePassword)

      if (keystoreKey) args.push('--ks-key-alias', keystoreKey)
    } else {
      args.push('--ks', await debugKeystore(), '--ks-pass', 'pass:android')
    }

    args.push('--out', out, aligned)

    await run('java', args)
  } finally {
    await fs.rm(temp)
  }
}

exports.createAPK = createAPK

async function readManifest(apk) {
  const output = await run(aapt2, ['dump', 'badging', path.resolve(apk)])

  const lines = output.split(/\r?\n/)

  const pkg = lines.find((line) => line.startsWith('package:')) || ''
  const activity = lines.find((line) => line.startsWith('launchable-activity:')) || ''

  return {
    packageName: attribute(pkg, 'name'),
    versionCode: attribute(pkg, 'versionCode'),
    versionName: attribute(pkg, 'versionName'),
    launchableActivity: attribute(activity, 'name')
  }
}

exports.readManifest = readManifest

async function minimumSDK(apk) {
  const output = await run(aapt2, ['dump', 'badging', apk])

  const match = /^minSdkVersion:'(\d+)'/m.exec(output)

  return match === null ? 1 : Number(match[1])
}

function included(include) {
  return include.flatMap((resource) => ['-C', path.dirname(resource), path.basename(resource)])
}

// Created the way Android's own tools create it.
async function debugKeystore() {
  const keystore = path.join(os.homedir(), '.android', 'debug.keystore')

  if (await fs.exists(keystore)) return keystore

  await fs.makeDir(path.dirname(keystore))

  await run('keytool', [
    '-genkeypair',
    '-keystore',
    keystore,
    '-storepass',
    'android',
    '-alias',
    'androiddebugkey',
    '-keypass',
    'android',
    '-keyalg',
    'RSA',
    '-keysize',
    '2048',
    '-validity',
    '10000',
    '-dname',
    'CN=Android Debug,O=Android,C=US'
  ])

  return keystore
}

function attribute(line, name) {
  const match = new RegExp(`\\b${name}='([^']*)'`).exec(line)

  return match === null ? null : match[1]
}

async function compileResources(dir, out) {
  out = path.resolve(out)

  const args = ['compile', '-o', out, '--dir', path.resolve(dir)]

  await run(aapt2, args)
}

async function linkResources(manifest, out, opts = {}) {
  const { targetSDK = DEFAULT_TARGET_SDK, resources, proto = false, archive = true } = opts

  out = path.resolve(out)

  const args = [
    'link',
    '-o',
    out,
    '--manifest',
    path.resolve(manifest),
    '-I',
    path.join(ANDROID_HOME, 'platforms', `android-${targetSDK}`, 'android.jar')
  ]

  if (resources) args.push('-R', path.resolve(resources), '--auto-add-overlay')

  if (proto) args.push('--proto-format')

  if (!archive) {
    await fs.makeDir(out)

    args.push('--output-to-dir')
  }

  await run(aapt2, args)
}
