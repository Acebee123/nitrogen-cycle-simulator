# Sharing the 2.5D simulator through WhatsApp

Both outputs now use the original 2.5D Canvas landscape. The standalone has no 3D model data or WebGL dependency.

The previously broken attachment was **dist-web/index.html**. That website entry needs its companion CSS, JavaScript and images. Sending only index.html explains the unstyled interface, inactive buttons and blank scene; the browser did not receive a complete simulator.

**Send dist-offline/Nitrogen-Cycle.html instead.** This approximately 6.4 MiB file embeds its CSS, JavaScript and bacteria pictures and generates audio locally. It performs no asset fetches and requires no server. Save the entire attachment and open it in a browser that permits local HTML JavaScript. Keep its `.html` extension.

For normal website hosting, use the entire dist-web directory or Nitrogen-Cycle-Website.zip. An inline startup diagnostic explains missing companion files; a noscript message explains JavaScript-disabled viewers.

Android grants access to individual shared content URIs, rather than automatically supplying a website folder: [Android secure file sharing](https://developer.android.com/training/secure-file-sharing/share-file). Embedded viewers can disable JavaScript: [Android WebSettings](https://developer.android.com/reference/android/webkit/WebSettings#setJavaScriptEnabled(boolean)). HTML cannot change those permissions, a viewer's execution policy or its attachment MIME handling. Web Audio requires a user gesture, so tap Sound before testing thunder.

Automated tests execute the actual embedded standalone application with fetch blocked. Actual Chrome Android/WhatsApp device testing remains unverified; see TESTING.md for exact checks and limits. Test the saved file with Wi-Fi/mobile data disabled, then exercise zoom/pan, focus mode, controls and bacteria pictures in portrait and landscape.
