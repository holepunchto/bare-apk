const test = require('brittle')
const path = require('path')
const fs = require('fs')
const { createAPK, createAPKSet, createAppBundle, readManifest, constants } = require('.')
const buildTools = require('./lib/build-tools')
const run = require('./lib/run')

const fixture = path.join(__dirname, 'test', 'fixtures', 'app')
const manifest = path.join(fixture, 'AndroidManifest.xml')
const resources = path.join(fixture, 'res')

test('create APK', async (t) => {
  const out = path.join(await t.tmp(), 'app.apk')

  await createAPK(manifest, out, {
    resources,
    include: [
      path.join(fixture, 'lib'),
      path.join(fixture, 'assets'),
      path.join(fixture, 'dex', 'classes.dex')
    ]
  })

  t.alike(await readManifest(out), {
    packageName: 'to.holepunch.test',
    versionCode: '1002003',
    versionName: '1.2.3',
    launchableActivity: 'to.holepunch.test.Activity'
  })

  t.alike(
    await alignment(out),
    {
      'AndroidManifest.xml': true,
      'resources.arsc': false,
      'lib/arm64-v8a/libhello.so': false,
      'assets/hello.txt': false,
      'classes.dex': false
    },
    'everything but the manifest is stored uncompressed, and no JAR signature is added'
  )

  t.ok((await verify(out)).includes('Verified using v3 scheme (APK Signature Scheme v3): true'))
})

test('create APK, sign with keystore', async (t) => {
  const dir = await t.tmp()

  const keystore = path.join(dir, 'release.keystore')

  await run('keytool', [
    '-genkeypair',
    '-keystore',
    keystore,
    '-storepass',
    'secret',
    '-alias',
    'release',
    '-keypass',
    'secret',
    '-keyalg',
    'RSA',
    '-keysize',
    '2048',
    '-validity',
    '1',
    '-dname',
    'CN=Release'
  ])

  const out = path.join(dir, 'app.apk')

  await createAPK(manifest, out, {
    resources,
    sign: true,
    keystore,
    keystoreKey: 'release',
    keystorePassword: 'pass:secret'
  })

  t.ok((await verify(out, ['--print-certs'])).includes('CN=Release'))
})

test('create app bundle', async (t) => {
  const out = path.join(await t.tmp(), 'app.aab')

  await createAppBundle(manifest, out, {
    resources,
    include: [path.join(fixture, 'lib'), path.join(fixture, 'assets'), path.join(fixture, 'dex')]
  })

  const entries = (await run('jar', ['--list', '--file', out])).split(/\r?\n/)

  for (const entry of [
    'base/manifest/AndroidManifest.xml',
    'base/resources.pb',
    'base/lib/arm64-v8a/libhello.so',
    'base/assets/hello.txt',
    'base/dex/classes.dex'
  ]) {
    t.ok(entries.includes(entry), entry)
  }
})

test('create APK set from app bundle', async (t) => {
  const dir = await t.tmp()

  const aab = path.join(dir, 'app.aab')

  await createAppBundle(manifest, aab, {
    resources,
    include: [path.join(fixture, 'lib'), path.join(fixture, 'dex')]
  })

  const out = path.join(dir, 'apks')

  await createAPKSet(aab, out, { universal: true, archive: false })

  const apk = path.join(out, 'universal.apk')

  t.ok(fs.existsSync(apk))
  t.is((await readManifest(apk)).packageName, 'to.holepunch.test')
})

// Whether each entry is compressed. Fails if anything is misaligned.
async function alignment(apk) {
  const { zipalign } = await buildTools(constants.ANDROID_HOME)

  const output = await run(zipalign, ['-c', '-P', '16', '-v', '4', apk])

  const entries = {}

  for (const line of output.split(/\r?\n/)) {
    const match = /^\s*\d+ (\S+) \(OK( - compressed)?\)$/.exec(line)

    if (match !== null) entries[match[1]] = match[2] !== undefined
  }

  return entries
}

async function verify(apk, args = []) {
  const { apksigner } = await buildTools(constants.ANDROID_HOME)

  return run('java', ['-jar', apksigner, 'verify', '--verbose', ...args, apk])
}
