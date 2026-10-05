const path = require('path')
const os = require('os')
const fs = require('./fs')

module.exports = async function buildTools(root) {
  const dir = path.join(root, 'build-tools')

  let versions = []

  try {
    versions = await fs.readDir(dir)
  } catch {}

  const [version] = versions
    .filter((name) => /^\d+\.\d+\.\d+$/.test(name))
    .sort((a, b) => compare(b, a))

  if (version === undefined) throw new Error(`No build tools found in '${dir}'`)

  const tools = path.join(dir, version)

  return {
    zipalign: path.join(tools, os.platform() === 'win32' ? 'zipalign.exe' : 'zipalign'),
    apksigner: path.join(tools, 'lib', 'apksigner.jar')
  }
}

function compare(a, b) {
  const x = a.split('.').map(Number)
  const y = b.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) return x[i] - y[i]
  }

  return 0
}
