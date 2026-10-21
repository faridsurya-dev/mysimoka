package com.mysimoka_mobile

import android.media.AudioManager
import android.media.ToneGenerator
import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * Short system beeps for hands-free measuring ("Simpan otomatis"), so the
 * operator hears that a child's result was saved without looking at the
 * phone. Uses the built-in ToneGenerator: no audio files, no extra library.
 */
class FeedbackToneModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = NAME

  /**
   * kind: "success" (short double beep, saved), "error" (low long tone) or
   * "stable" (single short beep: the device's stable reading filled the form).
   */
  @ReactMethod
  fun play(kind: String) {
    try {
      val generator = ToneGenerator(AudioManager.STREAM_NOTIFICATION, VOLUME)
      val (tone, durationMs) =
        when (kind) {
          "error" -> ToneGenerator.TONE_PROP_NACK to 400
          "stable" -> ToneGenerator.TONE_PROP_BEEP to 150
          else -> ToneGenerator.TONE_PROP_ACK to 250
        }
      generator.startTone(tone, durationMs)
      // Release after the tone has played; a ToneGenerator holds an audio track.
      android.os.Handler(android.os.Looper.getMainLooper())
        .postDelayed({ generator.release() }, durationMs + 200L)
    } catch (_: RuntimeException) {
      // No audio available (e.g. another app holds it): feedback is best-effort.
    }
  }

  companion object {
    const val NAME = "FeedbackTone"
    private const val VOLUME = 100
  }
}

class FeedbackTonePackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == FeedbackToneModule.NAME) FeedbackToneModule(reactContext) else null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      FeedbackToneModule.NAME to
        ReactModuleInfo(
          FeedbackToneModule.NAME,
          FeedbackToneModule::class.java.name,
          false, // canOverrideExistingModule
          false, // needsEagerInit
          false, // isCxxModule
          false, // isTurboModule
        ),
    )
  }
}
