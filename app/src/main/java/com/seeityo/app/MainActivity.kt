package com.seeityo.app

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
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
    private val p = ctx.getSharedPreferences("seeityo", Context.MODE_PRIVATE)
    var defaultZoom: Float get() = p.getFloat("zoom", 4f); set(v) = p.edit().putFloat("zoom", v).apply()
    var haptics: Boolean get() = p.getBoolean("haptics", true); set(v) = p.edit().putBoolean("haptics", v).apply()
    var autoTorch: Boolean get() = p.getBoolean("autoTorch", true); set(v) = p.edit().putBoolean("autoTorch", v).apply()
    var onboarded: Boolean get() = p.getBoolean("onboarded", false); set(v) = p.edit().putBoolean("onboarded", v).apply()
    var pro: Boolean get() = p.getBoolean("pro", false); set(v) = p.edit().putBoolean("pro", v).apply()
}

const val SITE_URL = "https://seeityo.com"
const val SUPPORT_EMAIL = "support@seeityo.com"
// Flip to true once Google Play Billing is wired up. Until then Pro shows a "coming soon" screen and everything is free.
const val PRO_ENABLED = false

val SiyPurple = Color(0xFF5B21D6)
val SiyInk = Color(0xFF0E0B1A)
val SiyMute = Color(0xFF5D5873)
val SiyTint = Color(0xFFF2EEFD)
val SiyBg = Color(0xFFFCFBFF)

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
                var onboarding by remember { mutableStateOf(!prefs.onboarded) }
                if (onboarding) {
                    Onboarding(
                        buttonLabel = if (permissionState) "Start" else "Allow camera & start",
                        onDone = {
                            prefs.onboarded = true; onboarding = false
                            if (!permissionState) permissionLauncher.launch(Manifest.permission.CAMERA)
                        }
                    )
                } else if (permissionState) {
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
        if (!permissionState && Prefs(this).onboarded) permissionLauncher.launch(Manifest.permission.CAMERA)
    }

    override fun onResume() {
        super.onResume()
        permissionState = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
    }
}

@Composable
fun PermissionScreen(showSettings: Boolean, onAllow: () -> Unit, onSettings: () -> Unit) {
    Column(Modifier.fillMaxSize().background(SiyBg).padding(28.dp), verticalArrangement = Arrangement.Center) {
        Text("SMALL TEXT SHOULDN'T BE A BIG PROBLEM", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = SiyMute, letterSpacing = 1.6.sp)
        Spacer(Modifier.height(12.dp))
        Text("SEE IT.", fontSize = 56.sp, fontWeight = FontWeight.Black, color = SiyInk, letterSpacing = (-2).sp, lineHeight = 52.sp)
        Text("READ IT.", fontSize = 56.sp, fontWeight = FontWeight.Black, color = SiyInk, letterSpacing = (-2).sp, lineHeight = 52.sp)
        Text("DONE.", fontSize = 56.sp, fontWeight = FontWeight.Black, color = SiyPurple, letterSpacing = (-2).sp, lineHeight = 52.sp)
        Spacer(Modifier.height(20.dp))
        Text("Leave your reading glasses at home. See It Yo opens your camera already zoomed in so small print is big and sharp. Nothing is saved. No photos, no account, no tracking.", color = SiyInk, fontSize = 17.sp, lineHeight = 24.sp)
        Spacer(Modifier.height(28.dp))
        if (showSettings) {
            Text("Camera is blocked. Turn it on in Settings, then come back.", color = Color(0xFFB45309))
            Spacer(Modifier.height(12.dp))
            Button(onClick = onSettings, modifier = Modifier.fillMaxWidth().height(58.dp), shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = SiyPurple, contentColor = Color.White)) { Text("Open Settings", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold) }
        } else {
            Button(onClick = onAllow, modifier = Modifier.fillMaxWidth().height(58.dp), shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = SiyPurple, contentColor = Color.White)) { Text("Allow camera", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold) }
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
    var showMenu by remember { mutableStateOf(false) }
    var showHow by remember { mutableStateOf(false) }
    var showPro by remember { mutableStateOf(false) }
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
        RoundBtn("☰", Modifier.align(Alignment.BottomEnd).padding(end = 14.dp, bottom = 84.dp)) { showMenu = true }
        if (showHow) Onboarding(buttonLabel = "Got it", onDone = { showHow = false })
    }

    if (showMenu) MenuSheet(
        onClose = { showMenu = false },
        onSettings = { showMenu = false; showSettings = true },
        onHow = { showMenu = false; showHow = true },
        onPro = { showMenu = false; showPro = true },
        onShare = { showMenu = false; shareApp(context) },
        onFeedback = { showMenu = false; sendFeedback(context, "See It Yo feedback") },
        onPrivacy = { showMenu = false; openUrl(context, "$SITE_URL/privacy/") }
    )
    if (showPro) ProSheet(onClose = { showPro = false }, onTellUs = { showPro = false; sendFeedback(context, "What I'd pay for in See It Yo Pro") })

    if (showSettings) SettingsSheet(prefs, zoomRatio, onZoomDefault = { prefs.defaultZoom = it; applyZoom(it) }, onClose = { showSettings = false })
}

@Composable
fun Pill(text: String, modifier: Modifier, bold: Boolean = true) {
    Text(text, color = Color.White, fontSize = 14.sp, fontWeight = if (bold) FontWeight.Bold else FontWeight.Medium, letterSpacing = if (bold) 1.5.sp else 0.sp,
        modifier = modifier.clip(RoundedCornerShape(999.dp)).background(if (text == "FROZEN") SiyPurple else Color(0x99000000)).padding(horizontal = 14.dp, vertical = 8.dp))
}

@Composable
fun RoundBtn(label: String, modifier: Modifier, active: Boolean = false, onClick: () -> Unit) {
    Box(modifier.size(52.dp).clip(CircleShape).background(if (active) Color(0xFFFFD25A) else Color(0x99000000)).pointerInput(Unit) { detectTapGestures(onTap = { onClick() }) }, contentAlignment = Alignment.Center) {
        Text(label, fontSize = 22.sp, color = if (active) Color.Black else Color.White)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsSheet(prefs: Prefs, current: Float, onZoomDefault: (Float) -> Unit, onClose: () -> Unit) {
    var haptics by remember { mutableStateOf(prefs.haptics) }
    var autoTorch by remember { mutableStateOf(prefs.autoTorch) }
    ModalBottomSheet(onDismissRequest = onClose, containerColor = Color.White) {
        Column(Modifier.padding(horizontal = 24.dp).padding(bottom = 36.dp)) {
            Text("Settings", fontSize = 28.sp, fontWeight = FontWeight.Black, color = SiyInk)
            Spacer(Modifier.height(16.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column { Text("Default zoom", color = SiyInk, fontSize = 17.sp); Text("Where See It Yo opens every time", color = SiyMute, fontSize = 13.sp) }
                Row { listOf(2f, 3f, 4f, 5f, 6f).forEach { z ->
                    val sel = prefs.defaultZoom == z
                    Text("${z.toInt()}×", color = if (sel) Color.White else SiyInk, fontWeight = FontWeight.Bold, fontSize = 14.sp,
                        modifier = Modifier.padding(start = 6.dp).clip(RoundedCornerShape(8.dp)).background(if (sel) SiyPurple else SiyTint)
                            .pointerInput(z) { detectTapGestures { onZoomDefault(z) } }.padding(horizontal = 10.dp, vertical = 6.dp))
                } }
            }
            HorizontalDivider(Modifier.padding(vertical = 14.dp), color = Color(0xFFE4DFF2))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column { Text("Auto flashlight", color = SiyInk, fontSize = 17.sp); Text("Turns on by itself when it's dark", color = SiyMute, fontSize = 13.sp) }
                Switch(checked = autoTorch, onCheckedChange = { autoTorch = it; prefs.autoTorch = it }, colors = SwitchDefaults.colors(checkedTrackColor = SiyPurple))
            }
            HorizontalDivider(Modifier.padding(vertical = 14.dp), color = Color(0xFFE4DFF2))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column { Text("Haptic on freeze", color = SiyInk, fontSize = 17.sp); Text("Short buzz when you freeze", color = SiyMute, fontSize = 13.sp) }
                Switch(checked = haptics, onCheckedChange = { haptics = it; prefs.haptics = it }, colors = SwitchDefaults.colors(checkedTrackColor = SiyPurple))
            }
            HorizontalDivider(Modifier.padding(vertical = 14.dp), color = Color(0xFFE4DFF2))
            Text("One-tap trigger: Samsung → Settings → Advanced features → Side button → Double press → See It Yo.  Pixel → Settings → System → Gestures → Quick Tap → See It Yo.", color = SiyMute, fontSize = 13.sp, lineHeight = 18.sp)
            Spacer(Modifier.height(8.dp))
            Text("See It Yo v0.6 beta · nothing is saved", color = SiyMute, fontSize = 12.sp)
        }
    }
}


fun openUrl(ctx: Context, url: String) {
    try { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (_: Exception) {}
}

fun shareApp(ctx: Context) {
    val i = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_SUBJECT, "See It Yo")
        putExtra(Intent.EXTRA_TEXT, "See It Yo: a free Android magnifier. One tap and small print gets big, sharp and lit. Leave your reading glasses at home. $SITE_URL")
    }
    try { ctx.startActivity(Intent.createChooser(i, "Share See It Yo")) } catch (_: Exception) {}
}

fun sendFeedback(ctx: Context, subject: String) {
    val i = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:$SUPPORT_EMAIL")).apply { putExtra(Intent.EXTRA_SUBJECT, subject) }
    try { ctx.startActivity(i) } catch (_: Exception) {}
}

@Composable
fun Step(num: String, title: String, body: String) {
    Row(Modifier.padding(bottom = 18.dp), verticalAlignment = Alignment.Top) {
        Box(Modifier.size(40.dp).clip(CircleShape).background(SiyTint), contentAlignment = Alignment.Center) {
            Text(num, color = SiyPurple, fontWeight = FontWeight.Black, fontSize = 18.sp)
        }
        Spacer(Modifier.width(14.dp))
        Column {
            Text(title, color = SiyInk, fontWeight = FontWeight.ExtraBold, fontSize = 19.sp)
            Text(body, color = SiyMute, fontSize = 16.sp, lineHeight = 22.sp)
        }
    }
}

@Composable
fun Onboarding(buttonLabel: String, onDone: () -> Unit) {
    var page by remember { mutableIntStateOf(0) }
    val last = 3
    Column(Modifier.fillMaxSize().background(SiyBg).statusBarsPadding().navigationBarsPadding().padding(horizontal = 28.dp, vertical = 20.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                repeat(4) { i ->
                    Box(Modifier.padding(end = 6.dp).height(8.dp).width(if (i == page) 24.dp else 8.dp).clip(RoundedCornerShape(99.dp)).background(if (i == page) SiyPurple else Color(0xFFD9D2F0)))
                }
            }
            if (page < last) Text("Skip", color = SiyMute, fontSize = 16.sp, fontWeight = FontWeight.SemiBold,
                modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable { page = last }.padding(8.dp))
        }
        Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(top = 32.dp)) {
            when (page) {
                0 -> {
                    Text("SEE IT.", fontSize = 56.sp, fontWeight = FontWeight.Black, color = SiyInk, letterSpacing = (-2).sp, lineHeight = 52.sp)
                    Text("READ IT.", fontSize = 56.sp, fontWeight = FontWeight.Black, color = SiyInk, letterSpacing = (-2).sp, lineHeight = 52.sp)
                    Text("DONE.", fontSize = 56.sp, fontWeight = FontWeight.Black, color = SiyPurple, letterSpacing = (-2).sp, lineHeight = 52.sp)
                    Spacer(Modifier.height(22.dp))
                    Text("Leave your reading glasses at home. See It Yo opens already zoomed in, so menus, labels and fine print are big and sharp. No camera fiddling.", color = SiyInk, fontSize = 18.sp, lineHeight = 26.sp)
                }
                1 -> {
                    Text("Point. Tap. Read.", fontSize = 34.sp, fontWeight = FontWeight.Black, color = SiyInk)
                    Spacer(Modifier.height(22.dp))
                    Step("1", "Point at the small print", "It opens already zoomed in. Nothing to set up.")
                    Step("2", "Tap to freeze", "Holds the page perfectly still. Then pinch to zoom more and drag to move around.")
                    Step("3", "Tap again to go live", "Double-tap to snap back to your default zoom.")
                    Step("4", "Dark room?", "It brightens by itself and turns the flashlight on if it has to. The torch button is there too.")
                }
                2 -> {
                    Text("Make it one tap.", fontSize = 34.sp, fontWeight = FontWeight.Black, color = SiyInk)
                    Spacer(Modifier.height(10.dp))
                    Text("Open it without hunting for the icon:", color = SiyMute, fontSize = 17.sp)
                    Spacer(Modifier.height(18.dp))
                    Step("•", "Samsung", "Settings, Advanced features, Side button, Double press, See It Yo.")
                    Step("•", "Pixel", "Settings, System, Gestures, Quick Tap, See It Yo.")
                    Step("•", "Any phone", "Long-press the See It Yo icon and drag it to your home screen.")
                    Text("You can replay this any time from the menu.", color = SiyMute, fontSize = 14.sp)
                }
                else -> {
                    Text("Private by design.", fontSize = 34.sp, fontWeight = FontWeight.Black, color = SiyInk)
                    Spacer(Modifier.height(22.dp))
                    Step("✓", "Nothing is saved", "No photos, no recordings. Frames only exist while you're looking.")
                    Step("✓", "No account, no ads, no tracking", "It doesn't even ask for internet access.")
                    Step("✓", "Camera only", "That's the one thing it needs. Tap below and say yes.")
                }
            }
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            if (page > 0) Text("Back", color = SiyMute, fontSize = 17.sp, fontWeight = FontWeight.SemiBold,
                modifier = Modifier.clip(RoundedCornerShape(12.dp)).clickable { page-- }.padding(horizontal = 14.dp, vertical = 16.dp))
            Button(onClick = { if (page < last) page++ else onDone() }, modifier = Modifier.weight(1f).height(58.dp), shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SiyPurple, contentColor = Color.White)) {
                Text(if (page < last) "Next" else buttonLabel, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
            }
        }
    }
}

@Composable
fun MenuRow(icon: String, title: String, sub: String, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).clickable { onClick() }.padding(vertical = 12.dp, horizontal = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(44.dp).clip(CircleShape).background(SiyTint), contentAlignment = Alignment.Center) { Text(icon, fontSize = 20.sp) }
        Spacer(Modifier.width(14.dp))
        Column { Text(title, color = SiyInk, fontSize = 17.sp, fontWeight = FontWeight.Bold); Text(sub, color = SiyMute, fontSize = 13.sp) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MenuSheet(onClose: () -> Unit, onSettings: () -> Unit, onHow: () -> Unit, onPro: () -> Unit, onShare: () -> Unit, onFeedback: () -> Unit, onPrivacy: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onClose, containerColor = Color.White) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 32.dp).verticalScroll(rememberScrollState())) {
            Text("See It Yo", fontSize = 28.sp, fontWeight = FontWeight.Black, color = SiyInk, modifier = Modifier.padding(start = 6.dp, bottom = 8.dp))
            MenuRow("⭐", "See It Yo Pro", if (PRO_ENABLED) "Unlock everything" else "Coming soon. Free during beta.", onPro)
            MenuRow("⚙", "Settings", "Zoom, flashlight, haptics", onSettings)
            MenuRow("❓", "How it works", "Replay the quick tutorial", onHow)
            MenuRow("📤", "Share with a friend", "Text it, post it, send it", onShare)
            MenuRow("💬", "Send feedback", "Tell us what's broken or missing", onFeedback)
            MenuRow("🔒", "Privacy", "Nothing is saved. Ever.", onPrivacy)
            Spacer(Modifier.height(8.dp))
            Text("See It Yo v0.6 beta", color = SiyMute, fontSize = 12.sp, modifier = Modifier.padding(start = 6.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProSheet(onClose: () -> Unit, onTellUs: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onClose, containerColor = Color.White) {
        Column(Modifier.padding(horizontal = 24.dp).padding(bottom = 36.dp).verticalScroll(rememberScrollState())) {
            Text("See It Yo Pro", fontSize = 30.sp, fontWeight = FontWeight.Black, color = SiyInk)
            Text(if (PRO_ENABLED) "Everything unlocked." else "Coming soon. Everything is free during the beta.", color = SiyPurple, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(16.dp))
            Text("The magnifier, freeze, zoom and flashlight stay free. Pro will be extras on top. Ideas we're weighing:", color = SiyMute, fontSize = 15.sp, lineHeight = 21.sp)
            Spacer(Modifier.height(12.dp))
            listOf("Read-aloud for the text you're looking at", "High-contrast and reading-friendly color modes", "Higher zoom steps and sharper stabilizing", "Save a frozen frame to your gallery").forEach {
                Text("•  $it", color = SiyInk, fontSize = 16.sp, lineHeight = 24.sp)
            }
            Spacer(Modifier.height(22.dp))
            Button(onClick = onTellUs, modifier = Modifier.fillMaxWidth().height(56.dp), shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SiyPurple, contentColor = Color.White)) {
                Text(if (PRO_ENABLED) "Upgrade" else "Tell us what you'd pay for", fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
            }
        }
    }
}
