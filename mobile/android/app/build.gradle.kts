import java.util.Properties

plugins {
    id("com.android.application")
}

val releaseKeystorePropertiesFile = rootProject.file("signing/release-keystore.properties")
val releaseKeystoreProperties = Properties().apply {
    if (releaseKeystorePropertiesFile.isFile) {
        releaseKeystorePropertiesFile.inputStream().use(::load)
    }
}

android {
    namespace = "ru.arisnet.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "ru.arisnet.app"
        minSdk = 21
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    signingConfigs {
        create("release") {
            storeFile = rootProject.file(
                releaseKeystoreProperties.getProperty("storeFile", "signing/release-keystore.jks")
            )
            storePassword = releaseKeystoreProperties.getProperty("storePassword")
            keyAlias = releaseKeystoreProperties.getProperty("keyAlias", "arisnet")
            keyPassword = releaseKeystoreProperties.getProperty("keyPassword")
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
