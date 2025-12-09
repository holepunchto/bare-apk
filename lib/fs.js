const path = require('path')
const fs = require('fs')
const os = require('os')

exports.rm = async function rm(name) {
  return new Promise((resolve, reject) => {
    fs.rm(name, { force: true, recursive: true }, (err) => {
      err ? reject(err) : resolve()
    })
  })
}

exports.renameFile = async function renameFile(src, dest) {
  return new Promise((resolve, reject) => {
    fs.rename(src, dest, (err) => {
      err ? reject(err) : resolve()
    })
  })
}
exports.makeDir = async function makeDir(name) {
  return new Promise((resolve, reject) => {
    fs.mkdir(name, { recursive: true }, (err) => {
      err ? reject(err) : resolve()
    })
  })
}

exports.tempDir = async function tempDir() {
  const name = Math.random().toString(16).slice(2)

  return new Promise((resolve, reject) => {
    fs.realpath(os.tmpdir(), (err, dir) => {
      if (err) return reject(err)

      dir = path.join(dir, `bare-apk-${name}`)

      fs.mkdir(dir, { recursive: true }, (err) => {
        err ? reject(err) : resolve(dir)
      })
    })
  })
}
