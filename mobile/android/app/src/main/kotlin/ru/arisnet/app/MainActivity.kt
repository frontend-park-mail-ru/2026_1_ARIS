package ru.arisnet.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import android.window.OnBackInvokedDispatcher

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var errorView: View
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingPermissionRequest: PermissionRequest? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.AppTheme)
        super.onCreate(savedInstanceState)

        val rootView = FrameLayout(this)

        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                PROGRESS_HEIGHT_DP.dp()
            ).also {
                it.gravity = Gravity.TOP
            }
            isIndeterminate = false
            max = 100
            progress = 0
            visibility = View.GONE
        }

        errorView = createErrorView()

        rootView.addView(webView)
        rootView.addView(progressBar)
        rootView.addView(errorView)

        setContentView(rootView)
        configureWebView()

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(resolveLaunchUrl(intent))
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            onBackInvokedDispatcher.registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT
            ) {
                handleBackNavigation()
            }
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        webView.loadUrl(resolveLaunchUrl(intent))
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        handleBackNavigation()
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode != FILE_CHOOSER_REQUEST_CODE) {
            return
        }

        val result = if (resultCode == RESULT_OK) {
            WebChromeClient.FileChooserParams.parseResult(resultCode, data)
        } else {
            null
        }

        filePathCallback?.onReceiveValue(result)
        filePathCallback = null
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)

        if (requestCode != WEB_PERMISSION_REQUEST_CODE) {
            return
        }

        val request = pendingPermissionRequest ?: return
        pendingPermissionRequest = null

        val grantedPermissions = permissions
            .zip(grantResults.toTypedArray())
            .filter { (_, result) -> result == PackageManager.PERMISSION_GRANTED }
            .map { (permission, _) -> permission }
            .toSet()

        val grantedResources = request.resources.filter { resource ->
            when (resource) {
                PermissionRequest.RESOURCE_VIDEO_CAPTURE -> Manifest.permission.CAMERA in grantedPermissions
                PermissionRequest.RESOURCE_AUDIO_CAPTURE -> Manifest.permission.RECORD_AUDIO in grantedPermissions
                else -> true
            }
        }.toTypedArray()

        if (grantedResources.isNotEmpty()) {
            request.grant(grantedResources)
        } else {
            request.deny()
        }
    }

    override fun onDestroy() {
        filePathCallback?.onReceiveValue(null)
        pendingPermissionRequest?.deny()
        (webView.parent as? ViewGroup)?.removeView(webView)
        webView.destroy()
        super.onDestroy()
    }

    private fun configureWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, newProgress: Int) {
                progressBar.progress = newProgress
                progressBar.visibility = if (newProgress in 1..99) View.VISIBLE else View.GONE
            }

            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                return try {
                    startActivityForResult(fileChooserParams.createIntent(), FILE_CHOOSER_REQUEST_CODE)
                    true
                } catch (_: ActivityNotFoundException) {
                    this@MainActivity.filePathCallback = null
                    filePathCallback.onReceiveValue(null)
                    Toast.makeText(this@MainActivity, R.string.no_external_app, Toast.LENGTH_SHORT).show()
                    false
                }
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    handlePermissionRequest(request)
                }
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                return handleUrl(request.url)
            }

            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                return handleUrl(Uri.parse(url))
            }

            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                hideError()
            }

            override fun onPageFinished(view: WebView, url: String) {
                progressBar.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && request.isForMainFrame) {
                    showError()
                }
            }

            @Deprecated("Deprecated in Java")
            override fun onReceivedError(
                view: WebView,
                errorCode: Int,
                description: String,
                failingUrl: String
            ) {
                if (failingUrl == view.url) {
                    showError()
                }
            }
        }
    }

    private fun handleUrl(uri: Uri): Boolean {
        val scheme = uri.scheme?.lowercase()

        if ((scheme == "http" || scheme == "https") && shouldOpenInsideApp(uri)) {
            return false
        }

        openExternal(uri)
        return true
    }

    private fun shouldOpenInsideApp(uri: Uri): Boolean {
        val host = uri.host?.lowercase() ?: return false
        return INTERNAL_HOSTS.any { internalHost ->
            host == internalHost || host.endsWith(".$internalHost")
        }
    }

    private fun openExternal(uri: Uri) {
        val intent = Intent(Intent.ACTION_VIEW, uri).apply {
            addCategory(Intent.CATEGORY_BROWSABLE)
        }

        try {
            startActivity(intent)
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, R.string.no_external_app, Toast.LENGTH_SHORT).show()
        }
    }

    private fun resolveLaunchUrl(intent: Intent): String {
        val data = intent.data
        return if (
            intent.action == Intent.ACTION_VIEW &&
            data != null &&
            data.scheme?.lowercase() in setOf("http", "https") &&
            shouldOpenInsideApp(data)
        ) {
            data.toString()
        } else {
            HOME_URL
        }
    }

    private fun handlePermissionRequest(request: PermissionRequest) {
        val requiredPermissions = request.resources.mapNotNull { resource ->
            when (resource) {
                PermissionRequest.RESOURCE_VIDEO_CAPTURE -> Manifest.permission.CAMERA
                PermissionRequest.RESOURCE_AUDIO_CAPTURE -> Manifest.permission.RECORD_AUDIO
                else -> null
            }
        }.distinct()

        if (requiredPermissions.isEmpty()) {
            request.grant(request.resources)
            return
        }

        val missingPermissions = requiredPermissions.filter { permission ->
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED
        }

        if (missingPermissions.isEmpty()) {
            request.grant(request.resources)
            return
        }

        pendingPermissionRequest?.deny()
        pendingPermissionRequest = request

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            requestPermissions(missingPermissions.toTypedArray(), WEB_PERMISSION_REQUEST_CODE)
        }
    }

    private fun createErrorView(): View {
        val container = LinearLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(24.dp(), 24.dp(), 24.dp(), 24.dp())
            setBackgroundColor(Color.rgb(17, 26, 51))
            visibility = View.GONE
        }

        val title = TextView(this).apply {
            text = getString(R.string.network_error_title)
            textSize = 22f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
        }

        val message = TextView(this).apply {
            text = getString(R.string.network_error_message)
            textSize = 15f
            setTextColor(Color.rgb(221, 226, 255))
            gravity = Gravity.CENTER
            setPadding(0, 12.dp(), 0, 22.dp())
        }

        val retry = Button(this).apply {
            text = getString(R.string.retry)
            setOnClickListener {
                hideError()
                webView.reload()
            }
        }

        container.addView(title)
        container.addView(message)
        container.addView(retry)

        return container
    }

    private fun showError() {
        progressBar.visibility = View.GONE
        errorView.visibility = View.VISIBLE
    }

    private fun hideError() {
        errorView.visibility = View.GONE
    }

    private fun handleBackNavigation() {
        if (errorView.visibility == View.VISIBLE) {
            hideError()
            return
        }

        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            finish()
        }
    }

    private fun Int.dp(): Int {
        return (this * resources.displayMetrics.density).toInt()
    }

    private companion object {
        private const val HOME_URL = "https://arisnet.ru"
        private const val FILE_CHOOSER_REQUEST_CODE = 1001
        private const val WEB_PERMISSION_REQUEST_CODE = 1002
        private const val PROGRESS_HEIGHT_DP = 3

        private val INTERNAL_HOSTS = setOf(
            "arisnet.ru",
            "vk.com",
            "vk.ru"
        )
    }
}
