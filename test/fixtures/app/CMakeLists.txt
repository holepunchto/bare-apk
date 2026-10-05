cmake_minimum_required(VERSION 4.0)

set(node_modules "${CMAKE_CURRENT_LIST_DIR}/../../../node_modules")

find_package(cmake-java REQUIRED PATHS "${node_modules}/cmake-java")
find_package(cmake-android REQUIRED PATHS "${node_modules}/cmake-android")

project(bare_apk_fixture C)

use_java()

add_library(hello SHARED hello.c)

find_android_jar(android_jar PLATFORM android-36)

add_dex(
  hello_classes
  SOURCES
    Hello.java
  INCLUDE_JARS
    ${android_jar}
)

install(
  TARGETS hello
  LIBRARY DESTINATION "${CMAKE_CURRENT_LIST_DIR}/lib/${ANDROID_ABI}"
)

install(
  FILES $<TARGET_PROPERTY:hello_classes,DEX_FILE>
  DESTINATION "${CMAKE_CURRENT_LIST_DIR}/dex"
)
