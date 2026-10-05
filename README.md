# bare-apk

APK packaging tools for Bare.

```
npm i bare-apk
```

## Usage

```js
const { createAppBundle, createAPK } = require('bare-apk')

// For distribution through Google Play
await createAppBundle('./path/to/AndroidManifest.xml', './app.aab')

// For installing directly, such as during development
await createAPK('./path/to/AndroidManifest.xml', './app.apk')
```

## License

Apache-2.0
