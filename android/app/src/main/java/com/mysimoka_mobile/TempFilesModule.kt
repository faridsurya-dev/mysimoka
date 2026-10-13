package com.mysimoka_mobile

import android.net.Uri
import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import java.io.File

/**
 * Deletes temporary photos (camera snapshots, gallery copies) once they were
 * sent, so children's face photos do not stay on the phone. Only files inside
 * the app's own cache directory can be deleted.
 */
class TempFilesModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = NAME

  /** Resolves true when the file was deleted (or was already gone). */
  @ReactMethod
  fun deleteCached(uriOrPath: String, promise: Promise) {
    try {
      val path = if (uriOrPath.startsWith("file://")) Uri.parse(uriOrPath).path else uriOrPath
      if (path.isNullOrEmpty()) {
        promise.resolve(false)
        return
      }
      val file = File(path).canonicalFile
      val cacheRoots =
        listOfNotNull(reactApplicationContext.cacheDir, reactApplicationContext.externalCacheDir)
          .map { it.canonicalPath + File.separator }
      if (cacheRoots.none { file.path.startsWith(it) }) {
        promise.resolve(false)
        return
      }
      promise.resolve(!file.exists() || file.delete())
    } catch (error: Exception) {
      promise.resolve(false)
    }
  }

  companion object {
    const val NAME = "TempFiles"
  }
}

class TempFilesPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == TempFilesModule.NAME) TempFilesModule(reactContext) else null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      TempFilesModule.NAME to
        ReactModuleInfo(
          TempFilesModule.NAME,
          TempFilesModule::class.java.name,
          false, // canOverrideExistingModule
          false, // needsEagerInit
          false, // isCxxModule
          false, // isTurboModule
        ),
    )
  }
}
