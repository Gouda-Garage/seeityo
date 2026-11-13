package com.bigread.app

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import java.util.concurrent.Executors
import kotlin.math.max
import kotlin.math.min

class Prefs(ctx: Context) {
    private val p = ctx.getSharedPreferences("big", Context.MODE_PRIVATE)
    var defaultZoom: Float get() = p.getFloat("zoom", 4f); set(v) = p.edit().putFloat("zoom", v).apply()
    var haptics: Boolean get() = p.getBoolean("haptics", true); set(v) = p.edit().putBoolean("haptics", v).apply()
    var autoTorch: Boolean get() = p.getBoolean("autoTorch", true); set(v) = p.edit().putBoolean("autoTorch", v).apply()
    var onboarded: Boolean get() = p.getBoolean("onboarded", false); set(v) = p.edit().putBoolean("onboarded", v).apply()
}

class MainActivity : ComponentActivity() {
    private var permissionState by mutableStateOf(false)
    private var askedOnce by mutableStateOf(false)
    private val permissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) {
        permissionState = it; askedOnce = true
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        permissionState = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                val prefs = remember { Prefs(this) }
                if (permissionState) {
                    CameraScreen(prefs)
                } else {
                    PermissionScreen(
                        showSettings = askedOnce && !shouldShowRequestPermissionRationale(Manifest.permission.CAMERA),
                        onAllow = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                        onSettings = { startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))) }
                    )
                }
            }
        }
        if (!permissionState) permissionLauncher.launch(Manifest.permission.CAMERA)
    }

    override fun onResume() {
        super.onResume()
        permissionState = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
    }
}

@Composable
fun PermissionScreen(showSettings: Boolean, onAllow: () -> Unit, onSettings: () -> Unit) {
    Column(Modifier.fillMaxSize().background(Color.Black).padding(28.dp), verticalArrangement = Arrangement.Center) {
        Text("See It Yo", fontSize = 52.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, letterSpacing = (-2).sp)
        Text("Tiny print. One tap.", fontSize = 22.sp, color = Color(0xFFBBBBBB))
        Spacer(Modifier.height(24.dp))
        Text("See It Yo opens your camera already zoomed in so you can read menus, labels and receipts. Nothing is saved. No photos, no account, no tracking.", color = Color(0xFFAAAAAA), fontSize = 17.sp, lineHeight = 24.sp)
        Spacer(Modifier.height(28.dp))
        if (showSettings) {
            Text("Camera is blocked. Turn it on in Settings, then come back.", color = Color(0xFFF5C518))
            Spacer(Modifier.height(12.dp))
            Button(onClick = onSettings, modifier = Modifier.fillMaxWidth().height(56.dp), shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black)) { Text("Open Settings", fontSize = 18.sp, fontWeight = FontWeight.SemiBold) }
        } else {
            Button(onClick = onAllow, modifier = Modifier.fillMaxWidth().height(56.dp), shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black)) { Text("Allow camera", fontSize = 18.sp, fontWeight = FontWeight.SemiBold) }
        }
    }
}

@Composable
fun CameraScreen(prefs: Prefs) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val analysisExecutor = remember { Executors.newSingleThreadExecutor() }

    var camera by remember { mutableStateOf<Camera?>(null) }
    var previewView by remember { mutableStateOf<PreviewView?>(null) }
    var zoomRatio by remember { mutableFloatStateOf(prefs.defaultZoom) }
    var maxZoom by remember { mutableFloatStateOf(8f) }
    var minZoom by remember { mutableFloatStateOf(1f) }
    var torchOn by remember { mutableStateOf(false) }
    var hasFlash by remember { mutableStateOf(false) }
    var autoTorched by remember { mutableStateOf(false) }
    var luma by remember { mutableFloatStateOf(128f) }
    var tick by remember { mutableIntStateOf(0) }

    var frozen by remember { mutableStateOf<Bitmap?>(null) }
    var fScale by remember { mutableFloatStateOf(1f) }
    var fOffset by remember { mutableStateOf(Offset.Zero) }
    var showSettings by remember { mutableStateOf(false) }
    var hintVisible by remember { mutableStateOf(true) }

    fun applyZoom(z: Float) {
        val c = camera ?: return
        val clamped = z.coerceIn(minZoom, maxZoom)
        zoomRatio = clamped
        c.cameraControl.setZoomRatio(clamped)
    }
    fun setTorch(on: Boolean) { camera?.cameraControl?.enableTorch(on); torchOn = on }
    fun haptic() { if (prefs.haptics) (context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator)?.vibrate(VibrationEffect.createOneShot(30, 90)) }

    // Auto torch on low light
    // Dim room: first boost exposure (free, no flash). Torch only if it stays near-black for ~3s.
    var darkCount by remember { mutableIntStateOf(0) }
    LaunchedEffect(tick, hasFlash, frozen) {
        if (frozen != null) return@LaunchedEffect
        val ec = camera?.cameraInfo?.exposureState
        if (ec != null && ec.isExposureCompensationSupported) {
            val hi = ec.exposureCompensationRange.upper
            camera?.cameraControl?.setExposureCompensationIndex(if (luma < 90f) hi else 0)
        }
        darkCount = if (luma < 14f) darkCount + 1 else 0
        if (hasFlash && prefs.autoTorch && !autoTorched && darkCount >= 6) { autoTorched = true; setTorch(true) }
    }
    LaunchedEffect(Unit) { kotlinx.coroutines.delay(3500); hintVisible = false }

    DisposableEffect(Unit) {
        onDispose { setTorch(false); frozen?.recycle(); frozen = null; analysisExecutor.shutdown() }
    }

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                PreviewView(ctx).apply {
                    implementationMode = PreviewView.ImplementationMode.COMPATIBLE // allows bitmap capture
                    scaleType = PreviewView.ScaleType.FILL_CENTER
                    previewView = this
                    val providerFuture = ProcessCameraProvider.getInstance(ctx)
                    providerFuture.addListener({
                        val provider = providerFuture.get()
                        val preview = Preview.Builder().build().also { it.surfaceProvider = surfaceProvider }
                        val analysis = ImageAnalysis.Builder()
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .setTargetResolution(android.util.Size(320, 240))
                            .build()
                        var frameCount = 0
                        analysis.setAnalyzer(analysisExecutor) { img ->
                            if (frameCount++ % 15 == 0) {
                                val buf = img.planes[0].buffer; buf.rewind()
                                val n = buf.remaining(); var sum = 0L; var i = 0
                                while (i < n) { sum += (buf.get(i).toInt() and 0xFF); i += 64 }
                                luma = sum.toFloat() / (n / 64).coerceAtLeast(1)
                                tick++
                            }
                            img.close()
                        }
                        provider.unbindAll()
                        val cam = provider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
                        camera = cam
                        hasFlash = cam.cameraInfo.hasFlashUnit()
                        cam.cameraInfo.zoomState.observe(lifecycleOwner) { zs ->
                            if (zs != null) { minZoom = zs.minZoomRatio; maxZoom = zs.maxZoomRatio }
                        }
                        cam.cameraControl.setZoomRatio(prefs.defaultZoom.coerceIn(1f, cam.cameraInfo.zoomState.value?.maxZoomRatio ?: 8f))
                    }, ContextCompat.getMainExecutor(ctx))
                }
            }
        )

        frozen?.let { bmp ->
            Image(
                bitmap = bmp.asImageBitmap(), contentDescription = null, contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize().graphicsLayer(scaleX = fScale, scaleY = fScale, translationX = fOffset.x, translationY = fOffset.y)
            )
        }

        // Gesture layer
        Box(Modifier.fillMaxSize()
            .pointerInput(frozen) {
                detectTransformGestures { _, pan, zoom, _ ->
                    if (frozen == null) { if (zoom != 1f) applyZoom(zoomRatio * zoom) }
                    else { fScale = (fScale * zoom).coerceIn(1f, 6f); fOffset += pan }
                }
            }
            .pointerInput(frozen) {
                detectTapGestures(
                    onTap = {
                        if (frozen == null) {
                            val bmp = previewView?.bitmap
                            if (bmp != null) { frozen = bmp; fScale = 1f; fOffset = Offset.Zero; haptic(); hintVisible = true }
                        } else { frozen?.recycle(); frozen = null; hintVisible = true }
                    },
                    onDoubleTap = { if (frozen == null) applyZoom(prefs.defaultZoom) else { fScale = 1f; fOffset = Offset.Zero } }
                )
            })

        // HUD
        Pill(if (frozen == null) "LIVE" else "FROZEN", Modifier.align(Alignment.TopCenter).padding(top = 18.dp))
        Pill(String.format("%.1f×", if (frozen == null) zoomRatio else zoomRatio * fScale), Modifier.align(Alignment.TopEnd).padding(top = 18.dp, end = 14.dp))
        if (hintVisible) Pill(if (frozen == null) "Tap to freeze · Pinch to zoom" else "Tap to resume · Pinch & drag", Modifier.align(Alignment.BottomCenter).padding(bottom = 26.dp), bold = false)

        if (hasFlash) RoundBtn(if (torchOn) "🔦" else "🔦", Modifier.align(Alignment.BottomStart).padding(start = 14.dp, bottom = 84.dp), active = torchOn) { autoTorched = true; setTorch(!torchOn) }
        RoundBtn("⚙", Modifier.align(Alignment.BottomEnd).padding(end = 14.dp, bottom = 84.dp)) { showSettings = true }
    }

    if (showSettings) SettingsSheet(prefs, zoomRatio, onZoomDefault = { prefs.defaultZoom = it; applyZoom(it) }, onClose = { showSettings = false })
}

@Composable
fun Pill(text: String, modifier: Modifier, bold: Boolean = true) {
    Text(text, color = Color.White, fontSize = 14.sp, fontWeight = if (bold) FontWeight.Bold else FontWeight.Medium, letterSpacing = if (bold) 1.5.sp else 0.sp,
        modifier = modifier.clip(RoundedCornerShape(999.dp)).background(Color(0x8C000000)).padding(horizontal = 14.dp, vertical = 8.dp))
}

@Composable
fun RoundBtn(label: String, modifier: Modifier, active: Boolean = false, onClick: () -> Unit) {
    Box(modifier.size(52.dp).clip(CircleShape).background(if (active) Color.White else Color(0x8C000000)).pointerInput(Unit) { detectTapGestures(onTap = { onClick() }) }, contentAlignment = Alignment.Center) {
        Text(label, fontSize = 22.sp, color = if (active) Color.Black else Color.White)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsSheet(prefs: Prefs, current: Float, onZoomDefault: (Float) -> Unit, onClose: () -> Unit) {
    var haptics by remember { mutableStateOf(prefs.haptics) }
    var autoTorch by remember { mutableStateOf(prefs.autoTorch) }
    ModalBottomSheet(onDismissRequest = onClose, containerColor = Color(0xFF0A0A0A)) {
        Column(Modifier.padding(horizontal = 24.dp).padding(bottom = 36.dp)) {
            Text("Settings", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Spacer(Modifier.height(16.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column { Text("Default zoom", color = Color.White, fontSize = 17.sp); Text("Where See It Yo opens every time", color = Color(0xFF777777), fontSize = 13.sp) }
                Row { listOf(2f, 3f, 4f, 5f, 6f).forEach { z ->
                    val sel = prefs.defaultZoom == z
                    Text("${z.toInt()}×", color = if (sel) Color.Black else Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp,
                        modifier = Modifier.padding(start = 6.dp).clip(RoundedCornerShape(8.dp)).background(if (sel) Color.White else Color(0xFF222222))
                            .pointerInput(z) { detectTapGestures { onZoomDefault(z) } }.padding(horizontal = 10.dp, vertical = 6.dp))
                } }
            }
            HorizontalDivider(Modifier.padding(vertical = 14.dp), color = Color(0xFF1C1C1C))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column { Text("Auto flashlight", color = Color.White, fontSize = 17.sp); Text("Turns on by itself when it's dark", color = Color(0xFF777777), fontSize = 13.sp) }
                Switch(checked = autoTorch, onCheckedChange = { autoTorch = it; prefs.autoTorch = it })
            }
            HorizontalDivider(Modifier.padding(vertical = 14.dp), color = Color(0xFF1C1C1C))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column { Text("Haptic on freeze", color = Color.White, fontSize = 17.sp); Text("Short buzz when you freeze", color = Color(0xFF777777), fontSize = 13.sp) }
                Switch(checked = haptics, onCheckedChange = { haptics = it; prefs.haptics = it })
            }
            HorizontalDivider(Modifier.padding(vertical = 14.dp), color = Color(0xFF1C1C1C))
            Text("One-tap trigger: Samsung → Settings → Advanced features → Side button → Double press → See It Yo.  Pixel → Settings → System → Gestures → Quick Tap → See It Yo.", color = Color(0xFF777777), fontSize = 13.sp, lineHeight = 18.sp)
            Spacer(Modifier.height(8.dp))
            Text("See It Yo v0.3 prototype · nothing is saved", color = Color(0xFF444444), fontSize = 12.sp)
        }
    }
}
