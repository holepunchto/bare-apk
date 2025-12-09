const fs = require('fs')

require.asset = require('require-asset')

try {
  const aapt2 = require.asset('#aapt2', __filename)

  try {
    fs.accessSync(aapt2, fs.constants.X_OK)
  } catch {
    fs.chmodSync(aapt2, 0o755)
  }

  module.exports = aapt2
} catch {
  module.exports = null
}
