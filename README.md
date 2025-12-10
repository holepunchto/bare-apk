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
  targetSDK: DEFAULT_TARGET_SDK,
  // Additional files and directories to include in uncompressed format
  include: []
}
```

#### `await createAPKSet(bundle, out[, options])`

Options include:

```js
options = {
  universal: false,
  archive: true,
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

#### `constants`

| Constant              | Description                                |
| :-------------------- | :----------------------------------------- |
| `ANDROID_HOME`        | The Android SDK root directory.            |
| `DEFAULT_MINIMUM_SDK` | The default minimum Android SDK API level. |
| `DEFAULT_TARGET_SDK`  | The default target Android SDK API level.  |

## License

Apache-2.0
