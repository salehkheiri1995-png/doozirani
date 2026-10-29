#!/usr/bin/env python3
"""Compatibility entry point; the real Android build is the Gradle project in android/."""
import os,subprocess,sys
root=os.path.dirname(os.path.abspath(__file__))
wrapper='gradlew.bat' if os.name=='nt' else './gradlew'
sys.exit(subprocess.run([wrapper,'assembleDebug'],cwd=os.path.join(root,'android')).returncode)
