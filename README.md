# bare-apk

APK packaging tools for Bare.

```
npm i bare-apk
```

## Usage

```js
const { createAppBundle, createAPK } = require('bare-apk')

await createAppBundle('./path/to/AndroidManifest.xml', './app.aab')

await createAPK('./app.aab', './app.apk')
```

## API

#### `await createAppBundle(manifest, out[, options])`

Options include:

```js
options = {
  // Additional files and directories to include in uncompressed format
  include: []
}
```

#### `await createAPKSet(bundle, out[, options])`

Options include:

```js
options = {
  universal: false,
  sign: false,
  keystore,
  keystoreKey,
  keystorePassword
}
```

#### `await createAPK(bundle, out[, options])`

Options include:

```js
options = {
  sign: false,
  keystore,
  keystoreKey,
  keystorePassword
}
```

## License

Apache-2.0
