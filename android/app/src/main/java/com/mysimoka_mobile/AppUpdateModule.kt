package com.mysimoka_mobile

import android.app.Activity
import android.content.Intent
import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability

/**
 * Google Play In-App Updates (immediate flow): Play shows its own update
 * screen, downloads and restarts the app. Only works for installs from Play;
 * elsewhere `check` reports no update (or rejects), which the JS side ignores.
 */
class AppUpdateModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private val manager by lazy { AppUpdateManagerFactory.create(reactApplicationContext) }
  private var lastInfo: AppUpdateInfo? = null
  private var flowPromise: Promise? = null

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName() = NAME

  @ReactMethod
  fun check(promise: Promise) {
    manager.appUpdateInfo
      .addOnSuccessListener { info ->
        lastInfo = info
        val availability = info.updateAvailability()
        val result = Arguments.createMap()
        result.putBoolean("available", availability == UpdateAvailability.UPDATE_AVAILABLE)
        result.putBoolean(
          "inProgress",
          availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS,
        )
        result.putBoolean("immediateAllowed", info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE))
        result.putInt("availableVersionCode", info.availableVersionCode())
        result.putInt("stalenessDays", info.clientVersionStalenessDays() ?: -1)
        result.putInt("priority", info.updatePriority())
        promise.resolve(result)
      }
      .addOnFailureListener { error -> promise.reject("E_UPDATE_CHECK", error.message, error) }
  }

  /** Resolves "ok", "canceled", "failed" or "not_started". Call `check` first. */
  @ReactMethod
  fun startImmediate(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    val info = lastInfo
    if (activity == null || info == null) {
      promise.resolve("not_started")
      return
    }
    // An AppUpdateInfo can start one flow only; the next start needs a new check.
    lastInfo = null
    flowPromise?.resolve("canceled")
    flowPromise = promise
    try {
      @Suppress("DEPRECATION")
      val started =
        manager.startUpdateFlowForResult(
          info,
          activity,
          AppUpdateOptions.defaultOptions(AppUpdateType.IMMEDIATE),
          REQUEST_CODE,
        )
      if (!started) {
        flowPromise = null
        promise.resolve("not_started")
      }
    } catch (error: Exception) {
      flowPromise = null
      promise.resolve("failed")
    }
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != REQUEST_CODE) {
      return
    }
    val promise = flowPromise ?: return
    flowPromise = null
    promise.resolve(
      when (resultCode) {
        Activity.RESULT_OK -> "ok"
        Activity.RESULT_CANCELED -> "canceled"
        else -> "failed"
      },
    )
  }

  override fun onNewIntent(intent: Intent) = Unit

  companion object {
    const val NAME = "AppUpdate"
    private const val REQUEST_CODE = 41_207
  }
}

class AppUpdatePackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == AppUpdateModule.NAME) AppUpdateModule(reactContext) else null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      AppUpdateModule.NAME to
        ReactModuleInfo(
          AppUpdateModule.NAME,
          AppUpdateModule::class.java.name,
          false, // canOverrideExistingModule
          false, // needsEagerInit
          false, // isCxxModule
          false, // isTurboModule
        ),
    )
  }
}
