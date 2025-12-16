const path = require('path')
const os = require('os')
const env = require('#env')
const fs = require('./lib/fs')
const run = require('./lib/run')
const aapt2 = require('./lib/aapt2')
const bundletool = require('./lib/bundletool')

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
      '.'
    ])

    for (const resource of include) {
      await run('jar', [
        '--update',
        '--no-compress',
        '--file',
        archive,
        '-C',
        path.dirname(resource),
        path.basename(resource)
      ])
    }

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

async function createAPK(bundle, out, opts = {}) {
  out = path.resolve(out)

  await fs.makeDir(path.dirname(out))

  const temp = await fs.tempDir()

  try {
    const apks = path.join(temp, 'base')

    await createAPKSet(bundle, apks, { ...opts, universal: true, archive: false })

    await fs.renameFile(path.join(temp, 'base', 'universal.apk'), out)
  } finally {
    await fs.rm(temp)
  }
}

exports.createAPK = createAPK

async function compileResources(dir, out) {
  out = path.resolve(out)

  const args = ['compile', '-o', out, '--dir', dir]

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
    manifest,
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
