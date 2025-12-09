require.asset = require('require-asset')

try {
  module.exports = require.asset('../prebuilds/bundletool.jar', __filename)
} catch {
  module.exports = null
}
