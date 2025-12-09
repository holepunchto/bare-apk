cmake_minimum_required(VERSION 4.0)

find_package(cmake-fetch REQUIRED PATHS node_modules/cmake-fetch)

project(bare_apk)

set(maven_root "https://dl.google.com/android/maven2")

set(tools_root "${maven_root}/com/android/tools/build")

set(aapt2_version "8.13.1-13719691")

fetch_package(
  "${tools_root}/aapt2/${aapt2_version}/aapt2-${aapt2_version}-osx.jar"
  SOURCE_DIR aapt2_macos_SOURCE_DIR
)

fetch_package(
  "${tools_root}/aapt2/${aapt2_version}/aapt2-${aapt2_version}-linux.jar"
  SOURCE_DIR aapt2_linux_SOURCE_DIR
)

fetch_package(
  "${tools_root}/aapt2/${aapt2_version}/aapt2-${aapt2_version}-windows.jar"
  SOURCE_DIR aapt2_windows_SOURCE_DIR
)

set(bundletool_version "1.18.2")

fetch_package(
  "https://github.com/google/bundletool/releases/download/${bundletool_version}/bundletool-all-${bundletool_version}.jar"
  SOURCE_DIR bundletool_SOURCE_DIR
  BINARY_DIR bundletool_BINARY_DIR
)

file(
  GLOB bundletool_sources
  RELATIVE "${bundletool_SOURCE_DIR}"
  LIST_DIRECTORIES ON
  "${bundletool_SOURCE_DIR}/*"
)

list(REMOVE_ITEM bundletool_sources macos linux windows)

file(
  ARCHIVE_CREATE
  OUTPUT "${bundletool_BINARY_DIR}/bundletool.jar"
  PATHS ${bundletool_sources}
  WORKING_DIRECTORY "${bundletool_SOURCE_DIR}"
  FORMAT zip
)

install(
  FILES "${aapt2_macos_SOURCE_DIR}/aapt2"
  DESTINATION darwin
)

install(
  FILES "${aapt2_linux_SOURCE_DIR}/aapt2"
  DESTINATION linux-x64
)

install(
  FILES "${aapt2_windows_SOURCE_DIR}/aapt2.exe"
  DESTINATION win32-x64
)

install(
  FILES "${bundletool_BINARY_DIR}/bundletool.jar"
  DESTINATION .
)
